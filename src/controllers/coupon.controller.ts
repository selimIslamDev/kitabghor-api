import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

const createCouponSchema = z.object({
  code: z.string().min(3, "কুপন কোড কমপক্ষে ৩ অক্ষর হতে হবে").toUpperCase(),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().positive("ডিসকাউন্ট সঠিক নয়"),
  minOrderAmount: z.number().positive().optional(),
  maxUsage: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

// কুপন validate করা (Customer)
export const validateCoupon = async (req: Request, res: Response) => {
  try {
    const { code, orderAmount } = req.body;
    if (!code) return res.status(400).json({ success: false, message: "কুপন কোড দিন" });

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

    if (!coupon) return res.status(404).json({ success: false, message: "কুপন পাওয়া যায়নি" });
    if (!coupon.isActive) return res.status(400).json({ success: false, message: "কুপনটি আর সক্রিয় নেই" });
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return res.status(400).json({ success: false, message: "কুপনের মেয়াদ শেষ হয়ে গেছে" });
    }
    if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) {
      return res.status(400).json({ success: false, message: "কুপনের ব্যবহার সীমা শেষ" });
    }
    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `এই কুপন ব্যবহার করতে কমপক্ষে ৳${coupon.minOrderAmount} এর অর্ডার করতে হবে`,
      });
    }

    // Discount calculate
    const discountAmount =
      coupon.discountType === "percent"
        ? (orderAmount * coupon.discountValue) / 100
        : coupon.discountValue;

    return res.json({
      success: true,
      message: "কুপন সফলভাবে প্রয়োগ হয়েছে",
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

// সব কুপন দেখা (Admin)
export const getCoupons = async (_req: Request, res: Response) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    return res.json({ success: true, data: coupons });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// নতুন কুপন বানানো (Admin)
export const createCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const body = createCouponSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, message: body.error.errors[0].message });

    const exists = await prisma.coupon.findUnique({ where: { code: body.data.code } });
    if (exists) return res.status(400).json({ success: false, message: "এই কুপন কোড আগেই আছে" });

    const coupon = await prisma.coupon.create({
      data: {
        ...body.data,
        expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : undefined,
      },
    });
    return res.status(201).json({ success: true, message: "কুপন তৈরি হয়েছে", data: coupon });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// কুপন active/inactive করা (Admin)
export const toggleCoupon = async (req: AuthRequest, res: Response) => {
  try {
    const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!coupon) return res.status(404).json({ success: false, message: "কুপন পাওয়া যায়নি" });

    const updated = await prisma.coupon.update({
      where: { id: req.params.id },
      data: { isActive: !coupon.isActive },
    });
    return res.json({
      success: true,
      message: updated.isActive ? "কুপন সক্রিয় করা হয়েছে" : "কুপন নিষ্ক্রিয় করা হয়েছে",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// কুপন ডিলিট (Admin)
export const deleteCoupon = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "কুপন ডিলিট হয়েছে" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};