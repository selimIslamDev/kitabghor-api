import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

const createCouponSchema = z.object({
  code: z.string().min(3, "Coupon code must be at least 3 characters").toUpperCase(),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().positive("Discount value is invalid"),
  minOrderAmount: z.number().positive().optional(),
  maxUsage: z.number().int().positive().optional(),
  expiresAt: z.string().optional(),
});

// Validate coupon (Customer)
export const validateCoupon = async (req: Request, res: Response) => {
  try {
    const { code, orderAmount } = req.body;
    if (!code) return res.status(400).json({ success: false, message: "Please enter a coupon code" });

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });
    if (!coupon.isActive) return res.status(400).json({ success: false, message: "This coupon is no longer active" });
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return res.status(400).json({ success: false, message: "This coupon has expired" });
    }
    if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) {
      return res.status(400).json({ success: false, message: "This coupon has reached its usage limit" });
    }
    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ৳${coupon.minOrderAmount} is required to use this coupon`,
      });
    }

    const discountAmount =
      coupon.discountType === "percent"
        ? (orderAmount * coupon.discountValue) / 100
        : coupon.discountValue;

    return res.json({
      success: true,
      message: "Coupon applied successfully",
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: Math.round(discountAmount),
        finalAmount: Math.round(orderAmount - discountAmount),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all coupons (Admin)
export const getCoupons = async (_req: Request, res: Response) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { code: "asc" },
    });
    return res.json({ success: true, data: coupons });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create coupon (Admin)
export const createCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const body = createCouponSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, message: body.error.errors[0].message });

    const exists = await prisma.coupon.findUnique({ where: { code: body.data.code } });
    if (exists) return res.status(400).json({ success: false, message: "This coupon code already exists" });

    const coupon = await prisma.coupon.create({
      data: {
        code: body.data.code,
        discountType: body.data.discountType,
        discountValue: body.data.discountValue,
        minOrderAmount: body.data.minOrderAmount,
        maxUsage: body.data.maxUsage,
        expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : undefined,
      },
    });
    return res.status(201).json({ success: true, message: "Coupon created successfully", data: coupon });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Toggle coupon active/inactive (Admin)
export const toggleCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found" });

    const updated = await prisma.coupon.update({
      where: { id: req.params.id },
      data: { isActive: !coupon.isActive },
    });
    return res.json({
      success: true,
      message: updated.isActive ? "Coupon activated" : "Coupon deactivated",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete coupon (Admin)
export const deleteCoupon = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};