import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { AuthRequest } from "../middleware/auth.middleware";

// ── Dashboard ────────────────────────────────────────────

export const getDashboard = async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      pendingOrders,
      totalRevenue,
      lowStockProducts,
      recentOrders,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.aggregate({
        where: { paymentStatus: "PAID" },
        _sum: { finalAmount: true },
      }),
      prisma.product.findMany({
        where: { stock: { lte: 5 } },
        select: { id: true, name: true, stock: true, productType: true },
        orderBy: { stock: "asc" },
        take: 10,
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          items: true,
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalProducts,
          totalOrders,
          pendingOrders,
          totalRevenue: totalRevenue._sum.finalAmount || 0,
        },
        lowStockProducts,
        recentOrders,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── Analytics ────────────────────────────────────────────

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = "monthly" } = req.query;

    // Last 6 months এর sales data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const orders = await prisma.order.findMany({
      where: {
        paymentStatus: "PAID",
        createdAt: { gte: sixMonthsAgo },
      },
      select: { finalAmount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Month অনুযায়ী group করা
    const monthlyData: Record<string, number> = {};
    orders.forEach((order) => {
      const month = order.createdAt.toISOString().slice(0, 7); // "2024-01"
      monthlyData[month] = (monthlyData[month] || 0) + order.finalAmount;
    });

    // Top selling products
    const topProducts = await prisma.orderItem.groupBy({
      by: ["productId", "productName"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    });

    // Category wise sales
    const categoryStats = await prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
    });

    return res.json({
      success: true,
      data: {
        monthlySales: Object.entries(monthlyData).map(([month, revenue]) => ({ month, revenue })),
        topProducts,
        categoryStats,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── Orders Management ────────────────────────────────────

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          items: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.order.count({ where }),
    ]);

    return res.json({
      success: true,
      data: orders,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
      trackingId: z.string().optional(),
    });

    const body = schema.safeParse(req.body);
    if (!body.success) return res.status(400).json({ success: false, message: body.error.errors[0].message });

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status: body.data.status,
        ...(body.data.trackingId && { trackingId: body.data.trackingId }),
      },
    });

    return res.json({ success: true, message: "অর্ডার স্ট্যাটাস আপডেট হয়েছে", data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── Users Management ─────────────────────────────────────

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: "CUSTOMER" },
        select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true,
          _count: { select: { orders: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
    ]);

    return res.json({
      success: true,
      data: users,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── Inventory ────────────────────────────────────────────

export const getInventory = async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        stock: true,
        productType: true,
        price: true,
        category: { select: { name: true } },
      },
      orderBy: { stock: "asc" },
    });

    const outOfStock = products.filter((p) => p.stock === 0).length;
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
    const inStock = products.filter((p) => p.stock > 5).length;

    return res.json({
      success: true,
      data: {
        summary: { outOfStock, lowStock, inStock, total: products.length },
        products,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateStock = async (req: AuthRequest, res: Response) => {
  try {
    const { stock } = req.body;
    if (stock === undefined || stock < 0) {
      return res.status(400).json({ success: false, message: "সঠিক stock পরিমাণ দিন" });
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { stock },
      select: { id: true, name: true, stock: true },
    });

    return res.json({ success: true, message: "Stock আপডেট হয়েছে", data: product });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};