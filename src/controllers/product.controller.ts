import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

const createProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().positive("Price is invalid"),
  discountPrice: z.number().positive().optional(),
  stock: z.number().int().min(0).default(0),
  productType: z.enum(["BOOK", "GADGET"]),
  categoryId: z.string().min(1, "Category is required"),
  images: z.array(z.string()).default([]),
  specifications: z.record(z.unknown()).optional(),
  author: z.string().optional(),
  publisher: z.string().optional(),
  edition: z.string().optional(),
  classLevel: z.string().optional(),
  subject: z.string().optional(),
  isbn: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
});

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

    const where: any = {};
    if (type) where.productType = type;
    if (categoryId) where.categoryId = categoryId;
    if (classLevel) where.classLevel = classLevel;
    if (subject) where.subject = subject;
    if (minPrice || maxPrice) {
      where.price = {
        ...(minPrice && { gte: minPrice }),
        ...(maxPrice && { lte: maxPrice }),
      };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { author: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderBy: any =
      sort === "price_asc" ? { price: "asc" } :
      sort === "price_desc" ? { price: "desc" } :
      { createdAt: "desc" };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          category: true,
          _count: { select: { reviews: true } },
        },
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
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    return res.json({ success: true, data: product });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const searchProducts = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, message: "Search query required" });

    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: String(q), mode: "insensitive" } },
          { author: { contains: String(q), mode: "insensitive" } },
          { subject: { contains: String(q), mode: "insensitive" } },
          { publisher: { contains: String(q), mode: "insensitive" } },
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
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

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

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const body = createProductSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, message: body.error.errors[0].message });

    const category = await prisma.category.findUnique({ where: { id: body.data.categoryId } });
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    const product = await prisma.product.create({
      data: {
        name: body.data.name,
        description: body.data.description,
        price: body.data.price,
        discountPrice: body.data.discountPrice,
        stock: body.data.stock,
        productType: body.data.productType,
        categoryId: body.data.categoryId,
        images: body.data.images,
        author: body.data.author,
        publisher: body.data.publisher,
        edition: body.data.edition,
        classLevel: body.data.classLevel,
        subject: body.data.subject,
        isbn: body.data.isbn,
        brand: body.data.brand,
        model: body.data.model,
      },
      include: { category: true },
    });
    return res.status(201).json({ success: true, message: "Product created successfully", data: product });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const body = createProductSchema.partial().safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, message: body.error.errors[0].message });

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name: body.data.name,
        description: body.data.description,
        price: body.data.price,
        discountPrice: body.data.discountPrice,
        stock: body.data.stock,
        productType: body.data.productType,
        categoryId: body.data.categoryId,
        images: body.data.images,
        author: body.data.author,
        publisher: body.data.publisher,
        edition: body.data.edition,
        classLevel: body.data.classLevel,
        subject: body.data.subject,
        isbn: body.data.isbn,
        brand: body.data.brand,
        model: body.data.model,
      },
      include: { category: true },
    });
    return res.json({ success: true, message: "Product updated successfully", data: product });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};