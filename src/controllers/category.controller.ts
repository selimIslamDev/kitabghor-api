import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["BOOK", "GADGET"]),
  parentId: z.string().optional(),
});

export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: true,
        _count: { select: { products: true } },
      },
    });
    return res.json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getCategoryProducts = async (req: Request, res: Response) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        products: {
          where: { stock: { gt: 0 } },
          orderBy: { createdAt: "desc" },
        },
        children: {
          include: { products: true },
        },
      },
    });
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    return res.json({ success: true, data: category });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const body = categorySchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, message: body.error.errors[0].message });

    const category = await prisma.category.create({
      data: {
        name: body.data.name,
        type: body.data.type,
        parentId: body.data.parentId ?? null,
      },
    });
    return res.status(201).json({ success: true, message: "Category created successfully", data: category });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const body = categorySchema.partial().safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, message: body.error.errors[0].message });

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        name: body.data.name,
        type: body.data.type,
        parentId: body.data.parentId ?? null,
      },
    });
    return res.json({ success: true, message: "Category updated successfully", data: category });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};