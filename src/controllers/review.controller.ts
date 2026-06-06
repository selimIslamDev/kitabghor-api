import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5, "রেটিং ১-৫ এর মধ্যে হতে হবে"),
  comment: z.string().optional(),
});

// একটি product এর সব review
export const getProductReviews = async (req: Request, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { productId: req.params.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Average rating calculate
    const avgRating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    return res.json({
      success: true,
      data: reviews,
      meta: {
        total: reviews.length,
        averageRating: Math.round(avgRating * 10) / 10,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Review দেওয়া
export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const body = reviewSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, message: body.error.errors[0].message });

    // Product আছে কিনা চেক
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ success: false, message: "প্রোডাক্ট পাওয়া যায়নি" });

    // আগে review দিয়েছে কিনা চেক
    const existing = await prisma.review.findFirst({
      where: { productId: req.params.id, userId: req.userId },
    });
    if (existing) return res.status(400).json({ success: false, message: "আপনি আগেই এই প্রোডাক্টে review দিয়েছেন" });

    const review = await prisma.review.create({
      data: {
        productId: req.params.id,
        userId: req.userId!,
        rating: body.data.rating,
        comment: body.data.comment,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return res.status(201).json({ success: true, message: "Review দেওয়া হয়েছে", data: review });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Review ডিলিট
export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) return res.status(404).json({ success: false, message: "Review পাওয়া যায়নি" });

    // নিজের review বা admin ডিলিট করতে পারবে
    if (review.userId !== req.userId && req.userRole !== "ADMIN") {
      return res.status(403).json({ success: false, message: "এই review ডিলিট করার অনুমতি নেই" });
    }

    await prisma.review.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Review ডিলিট হয়েছে" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};