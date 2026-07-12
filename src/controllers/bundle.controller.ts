import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

const createBundleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  discountPercent: z.number().min(0).max(100),
  productIds: z.array(z.string()).min(2, "At least 2 products required for a bundle"),
});

const calcPrices = (bundle: any) => {
  const totalPrice = bundle.items.reduce(
    (sum: number, item: any) => sum + item.product.price * item.quantity,
    0
  );
  const bundlePrice = Math.round(totalPrice * (1 - bundle.discountPercent / 100));
  return { ...bundle, totalPrice, bundlePrice };
};

export const getBundles = async (_req: Request, res: Response) => {
  try {
    const bundles = await prisma.bundle.findMany({
      include: { items: { include: { product: { include: { category: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, data: bundles.map(calcPrices) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getBundle = async (req: Request, res: Response) => {
  try {
    const bundle = await prisma.bundle.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { product: { include: { category: true } } } } },
    });
    if (!bundle) return res.status(404).json({ success: false, message: "Bundle not found" });
    return res.json({ success: true, data: calcPrices(bundle) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createBundle = async (req: AuthRequest, res: Response) => {
  try {
    const body = createBundleSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, message: body.error.errors[0].message });

    const bundle = await prisma.bundle.create({
      data: {
        name: body.data.name,
        description: body.data.description,
        discountPercent: body.data.discountPercent,
        items: { create: body.data.productIds.map((productId) => ({ productId, quantity: 1 })) },
      },
      include: { items: { include: { product: true } } },
    });
    return res.status(201).json({ success: true, message: "Bundle created successfully", data: bundle });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateBundle = async (req: AuthRequest, res: Response) => {
  try {
    const body = createBundleSchema.partial().safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, message: body.error.errors[0].message });

    if (body.data.productIds) {
      await prisma.bundleItem.deleteMany({ where: { bundleId: req.params.id } });
    }

    const bundle = await prisma.bundle.update({
      where: { id: req.params.id },
      data: {
        name: body.data.name,
        description: body.data.description,
        discountPercent: body.data.discountPercent,
        ...(body.data.productIds && {
          items: { create: body.data.productIds.map((productId) => ({ productId, quantity: 1 })) },
        }),
      },
      include: { items: { include: { product: true } } },
    });
    return res.json({ success: true, message: "Bundle updated successfully", data: bundle });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteBundle = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.bundleItem.deleteMany({ where: { bundleId: req.params.id } });
    await prisma.bundle.delete({ where: { id: req.params.id } });
    return res.json({ success: true, message: "Bundle deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};