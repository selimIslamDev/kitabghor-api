import { Request, Response } from "express";
import SSLCommerzPayment from "sslcommerz-lts";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth.middleware";
import { getIO } from "../config/socket";
import { sendOrderConfirmationEmail } from "../services/email.service";

const store_id = process.env.SSLCOMMERZ_STORE_ID as string;
const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD as string;
const is_live = process.env.SSLCOMMERZ_IS_LIVE === "true";

const BACKEND_URL = process.env.BACKEND_URL as string;
const FRONTEND_URL = process.env.FRONTEND_URL as string;

export const initiateSSLCommerzPayment = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.userId },
      include: { user: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.paymentStatus === "PAID") {
      return res.status(400).json({ success: false, message: "This order is already paid" });
    }

    const tran_id = `${order.id}-${Date.now()}`;
    const shippingAddress = order.shippingAddress as any;

    const data = {
      total_amount: order.finalAmount,
      currency: "BDT",
      tran_id,
      success_url: `${BACKEND_URL}/api/v1/payments/sslcommerz/success`,
      fail_url: `${BACKEND_URL}/api/v1/payments/sslcommerz/fail`,
      cancel_url: `${BACKEND_URL}/api/v1/payments/sslcommerz/cancel`,
      ipn_url: `${BACKEND_URL}/api/v1/payments/sslcommerz/ipn`,
      shipping_method: "Courier",
      product_name: "KitabGhor Order",
      product_category: "Books & Gadgets",
      product_profile: "general",
      cus_name: shippingAddress?.fullName || order.user.name,
      cus_email: order.user.email,
      cus_add1: shippingAddress?.address || "N/A",
      cus_add2: shippingAddress?.district || "N/A",
      cus_city: shippingAddress?.city || "N/A",
      cus_state: shippingAddress?.district || "N/A",
      cus_postcode: shippingAddress?.postalCode || "1000",
      cus_country: "Bangladesh",
      cus_phone: shippingAddress?.phone || order.user.phone || "01700000000",
      ship_name: shippingAddress?.fullName || order.user.name,
      ship_add1: shippingAddress?.address || "N/A",
      ship_city: shippingAddress?.city || "N/A",
      ship_postcode: shippingAddress?.postalCode || "1000",
      ship_country: "Bangladesh",
    };

    await prisma.order.update({
      where: { id: order.id },
      data: { trackingId: tran_id },
    });

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const apiResponse = await sslcz.init(data);

    if (!apiResponse?.GatewayPageURL) {
      return res.status(502).json({
        success: false,
        message: "SSLCommerz session তৈরি করা যায়নি",
        detail: apiResponse?.failedreason || null,
      });
    }

    return res.json({ success: true, data: { gatewayUrl: apiResponse.GatewayPageURL } });
  } catch (error) {
    console.error("SSLCommerz initiate error:", error);
    return res.status(500).json({ success: false, message: "Payment gateway error" });
  }
};

export const sslcommerzSuccess = async (req: Request, res: Response): Promise<any> => {
  try {
    const { val_id, tran_id } = req.body;

    if (!val_id || !tran_id) {
      return res.redirect(`${FRONTEND_URL}/payment/fail?reason=missing_params`);
    }

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const validation = await sslcz.validate({ val_id });

    if (validation.status !== "VALID" && validation.status !== "VALIDATED") {
      return res.redirect(`${FRONTEND_URL}/payment/fail?reason=invalid_payment`);
    }

    const order = await prisma.order.findFirst({ where: { trackingId: tran_id } });

    if (!order) {
      return res.redirect(`${FRONTEND_URL}/payment/fail?reason=order_not_found`);
    }

    if (order.paymentStatus !== "PAID") {
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "PAID", status: "CONFIRMED" },
        include: { items: true, user: true },
      });

      try {
        const io = getIO();
        io.to("admin-room").emit("order-paid", { id: order.id, finalAmount: order.finalAmount });
      } catch (e) {}

      sendOrderConfirmationEmail({
        toEmail: updatedOrder.user.email,
        customerName: updatedOrder.user.name,
        orderId: updatedOrder.id,
        items: updatedOrder.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
        })),
        finalAmount: updatedOrder.finalAmount,
        shippingAddress: updatedOrder.shippingAddress as any,
      });
    }

    return res.redirect(`${FRONTEND_URL}/payment/success?orderId=${order.id}`);
  } catch (error) {
    console.error("SSLCommerz success handler error:", error);
    return res.redirect(`${FRONTEND_URL}/payment/fail?reason=server_error`);
  }
};

export const sslcommerzFail = async (req: Request, res: Response): Promise<any> => {
  const { tran_id } = req.body;
  if (tran_id) {
    const order = await prisma.order.findFirst({ where: { trackingId: tran_id } });
    if (order && order.paymentStatus !== "PAID") {
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "UNPAID" } });
    }
  }
  return res.redirect(`${FRONTEND_URL}/payment/fail`);
};

export const sslcommerzCancel = async (req: Request, res: Response): Promise<any> => {
  const { tran_id } = req.body;
  if (tran_id) {
    const order = await prisma.order.findFirst({ where: { trackingId: tran_id } });
    if (order && order.paymentStatus !== "PAID") {
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "UNPAID" } });
    }
  }
  return res.redirect(`${FRONTEND_URL}/payment/cancel`);
};

export const sslcommerzIPN = async (req: Request, res: Response): Promise<any> => {
  try {
    const { val_id, tran_id, status } = req.body;

    if (status !== "VALID") {
      return res.status(200).send("IPN received - not valid, ignored");
    }

    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    const validation = await sslcz.validate({ val_id });

    if (validation.status === "VALID" || validation.status === "VALIDATED") {
      const order = await prisma.order.findFirst({ where: { trackingId: tran_id } });
      if (order && order.paymentStatus !== "PAID") {
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: "PAID", status: "CONFIRMED" },
        });
      }
    }

    return res.status(200).send("IPN processed");
  } catch (error) {
    console.error("SSLCommerz IPN error:", error);
    return res.status(500).send("IPN error");
  }
};