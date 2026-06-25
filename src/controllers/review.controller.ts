import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().optional(),
});

export const getProductReviews = async (req: Request, res: Response): Promise<any> => {
  try {
    const reviews = await prisma.review.findMany({
      where: { productId: req.params.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

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

export const createReview = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const body = reviewSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, message: body.error.errors[0].message });

    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const existing = await prisma.review.findFirst({
      where: { productId: req.params.id, userId: req.userId },
    });
    if (existing) return res.status(400).json({ success: false, message: "You have already reviewed this product" });

    const review = await prisma.review.create({
      data: {
        productId: req.params.id,
        userId: req.userId!,
        rating: body.data.rating,
        comment: body.data.comment,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return res.status(201).json({ success: true, message: "Review submitted successfully", data: review });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteReview = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    if (review.userId !== req.userId && req.userRole !== "ADMIN") {
      return res.status(403).json({ success: false, message: "You do not have permission to delete this review" });
    }

    await prisma.review.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};