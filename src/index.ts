import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { initSocket } from "./config/socket";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Init Socket.io
initSocket(httpServer);

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import productRoutes from "./routes/product.routes";
import categoryRoutes from "./routes/category.routes";
import bundleRoutes from "./routes/bundle.routes";
import cartRoutes from "./routes/cart.routes";
import orderRoutes from "./routes/order.routes";
import reviewRoutes from "./routes/review.routes";
import couponRoutes from "./routes/coupon.routes";
import paymentRoutes from "./routes/payment.routes";
import adminRoutes from "./routes/admin.routes";

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/bundles", bundleRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1", reviewRoutes);
app.use("/api/v1/coupons", couponRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/admin", adminRoutes);

// Health Check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "KitabGhor API চালু আছে 🚀" });
});

// Start with HTTP server (not app.listen)
httpServer.listen(PORT, () => {
  console.log(`✅ KitabGhor API running → http://localhost:${PORT}`);
});

export default app;