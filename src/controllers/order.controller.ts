import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth.middleware";
import { getIO } from "../config/socket";

const createOrderSchema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().min(1) })).min(1),
  shippingAddress: z.object({
    fullName: z.string(),
    phone: z.string(),
    address: z.string(),
    city: z.string(),
    district: z.string(),
    postalCode: z.string().optional(),
  }),
  paymentMethod: z.enum(["sslcommerz", "bkash", "nagad"]),
  couponCode: z.string().optional(),
});

export const createOrder = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const body = createOrderSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, message: body.error.errors[0].message });

    const { items, shippingAddress, paymentMethod, couponCode } = body.data;

    const products = await Promise.all(
      items.map((item) => prisma.product.findUnique({ where: { id: item.productId } }))
    );

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      if (!product) return res.status(404).json({ success: false, message: "Product not found" });
      if (product.stock < items[i].quantity) {
        return res.status(400).json({ success: false, message: `${product.name} is out of stock` });
      }
    }

    let totalAmount = 0;
    const orderItems = items.map((item, i) => {
      const product = products[i]!;
      const price = product.discountPrice || product.price;
      totalAmount += price * item.quantity;
      return {
        productId: product.id,
        productName: product.name,
        productImage: product.images[0] || "",
        quantity: item.quantity,
        price,
      };
    });

    let discountAmount = 0;
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode, isActive: true } });
      if (coupon) {
        if (!coupon.minOrderAmount || totalAmount >= coupon.minOrderAmount) {
          discountAmount = coupon.discountType === "percent"
            ? (totalAmount * coupon.discountValue) / 100
            : coupon.discountValue;
          await prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
        }
      }
    }

    const finalAmount = totalAmount - discountAmount;

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { name: true, email: true, phone: true },
    });

    const order = await prisma.order.create({
      data: {
        userId: req.userId!,
        totalAmount,
        discountAmount,
        finalAmount,
        paymentMethod,
        shippingAddress,
        couponCode,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    await Promise.all(
      items.map((item) =>
        prisma.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } })
      )
    );

    try {
      const io = getIO();
      io.to("admin-room").emit("new-order", {
        id: order.id,
        customerName: user?.name || "Unknown",
        customerPhone: user?.phone || "",
        totalAmount: order.finalAmount,
        itemCount: order.items.length,
        paymentMethod: order.paymentMethod,
        createdAt: order.createdAt,
      });
    } catch (e) {}

    return res.status(201).json({ success: true, message: "Order placed successfully", data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getOrder = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    return res.json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.userId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};