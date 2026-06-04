import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";

const filterSchema = z.object({
  type: z.enum(["BOOK", "GADGET"]).optional(),
  categoryId: z.string().optional(),
  classLevel: z.string().optional(),
  subject: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  search: z.string().optional(),
  sort: z.enum(["price_asc", "price_desc", "newest", "popular"]).optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

export const getProducts = async (req: Request, res: Response) => {
  try {
    const query = filterSchema.parse(req.query);
    const { type, categoryId, classLevel, subject, minPrice, maxPrice, search, sort, page, limit } = query;

    const where: Record<string, unknown> = {};
    if (type) where.productType = type;
    if (categoryId) where.categoryId = categoryId;
    if (classLevel) where.classLevel = classLevel;
    if (subject) where.subject = subject;
    if (minPrice || maxPrice) where.price = { ...(minPrice && { gte: minPrice }), ...(maxPrice && { lte: maxPrice }) };
    if (search) where.name = { contains: search, mode: "insensitive" };

    const orderBy: Record<string, unknown> =
      sort === "price_asc" ? { price: "asc" } :
      sort === "price_desc" ? { price: "desc" } :
      sort === "popular" ? { reviews: { _count: "desc" } } :
      { createdAt: "desc" };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: { category: true, _count: { select: { reviews: true } } },
      }),
      prisma.product.count({ where }),
    ]);

    return res.json({
      success: true,
      data: products,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        reviews: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { reviews: true } },
      },
    });
    if (!product) return res.status(404).json({ success: false, message: "প্রোডাক্ট পাওয়া যায়নি" });
    return res.json({ success: true, data: product });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const searchProducts = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, message: "Search query দিন" });

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: String(q), mode: "insensitive" } },
          { author: { contains: String(q), mode: "insensitive" } },
          { subject: { contains: String(q), mode: "insensitive" } },
        ],
      },
      take: 10,
      include: { category: true },
    });
    return res.json({ success: true, data: products });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getFeatured = async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { stock: { gt: 0 } },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { category: true },
    });
    return res.json({ success: true, data: products });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getRelated = async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ success: false, message: "পাওয়া যায়নি" });

    const related = await prisma.product.findMany({
      where: { categoryId: product.categoryId, id: { not: product.id }, stock: { gt: 0 } },
      take: 4,
      include: { category: true },
    });
    return res.json({ success: true, data: related });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
