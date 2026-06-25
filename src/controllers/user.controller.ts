import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
});

export const updateProfile = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const body = updateProfileSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, message: body.error.errors[0].message });

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: body.data,
      select: { id: true, name: true, email: true, phone: true, role: true },
    });
    return res.json({ success: true, message: "Profile updated successfully", data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getWishlist = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const wishlist = await prisma.wishlist.findMany({
      where: { userId: req.userId },
      include: { product: { include: { category: true } } },
      orderBy: { id: "desc" },
    });
    return res.json({ success: true, data: wishlist.map((w) => w.product) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const addToWishlist = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const existing = await prisma.wishlist.findFirst({
      where: { userId: req.userId, productId },
    });
    if (existing) return res.status(400).json({ success: false, message: "Product already in wishlist" });

    await prisma.wishlist.create({ data: { userId: req.userId!, productId } });
    return res.status(201).json({ success: true, message: "Added to wishlist" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const removeFromWishlist = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { productId } = req.params;
    await prisma.wishlist.deleteMany({
      where: { userId: req.userId, productId },
    });
    return res.json({ success: true, message: "Removed from wishlist" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAddresses = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const addresses = await prisma.address.findMany({ where: { userId: req.userId } });
    return res.json({ success: true, data: addresses });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const addAddress = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const schema = z.object({
      fullName: z.string().min(1),
      phone: z.string().min(1),
      address: z.string().min(1),
      city: z.string().min(1),
      district: z.string().min(1),
      postalCode: z.string().optional(),
      isDefault: z.boolean().default(false),
    });

    const body = schema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, message: body.error.errors[0].message });

    if (body.data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.userId },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        fullName: body.data.fullName,
        phone: body.data.phone,
        address: body.data.address,
        city: body.data.city,
        district: body.data.district,
        postalCode: body.data.postalCode,
        isDefault: body.data.isDefault,
        userId: req.userId!,
      },
    });
    return res.status(201).json({ success: true, message: "Address added successfully", data: address });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteAddress = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    await prisma.address.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });
    return res.json({ success: true, message: "Address deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};