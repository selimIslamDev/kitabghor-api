import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/prisma";

// ── Validation Schemas ──────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2, "নাম কমপক্ষে ২ অক্ষর হতে হবে"),
  email: z.string().email("সঠিক email দিন"),
  password: z.string().min(6, "পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে"),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ── Controllers ─────────────────────────────────────────
export const register = async (req: Request, res: Response) => {
  try {
    const body = registerSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, message: body.error.errors[0].message });

    const { name, email, password, phone } = body.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ success: false, message: "এই email দিয়ে আগেই অ্যাকাউন্ট আছে" });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, phone },
    });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "রেজিস্ট্রেশন সফল হয়েছে",
      data: {
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
        token,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, message: "Email বা পাসওয়ার্ড সঠিক নয়" });

    const { email, password } = body.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ success: false, message: "Email বা পাসওয়ার্ড ভুল" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Email বা পাসওয়ার্ড ভুল" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.json({
      success: true,
      message: "লগইন সফল",
      data: {
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
        token,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMe = async (req: Request & { userId?: string }, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ success: false, message: "User পাওয়া যায়নি" });
    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
