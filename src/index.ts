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

// ---------- CORS CONFIG ----------
// Normalize helper: remove trailing slash so "https://x.com/" and "https://x.com" both match
const normalize = (url: string) => url.trim().replace(/\/+$/, "");

// Support multiple origins via comma-separated FRONTEND_URL env var
// e.g. FRONTEND_URL=https://kitabghor-web.vercel.app,https://kitabghor.com
const envOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)
  .map(normalize);

const allowedOrigins = [
  ...envOrigins,
  "http://localhost:3000", // local dev
  "https://kitabghor-web.vercel.app", // hardcoded safety net for production
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server, mobile apps)
      if (!origin) return callback(null, true);

      const normalizedOrigin = normalize(origin);

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Allow any *.vercel.app preview deployment (optional, useful during dev)
      if (/^https:\/\/kitabghor-web-[a-z0-9-]+\.vercel\.app$/.test(normalizedOrigin)) {
        return callback(null, true);
      }

      console.warn(`❌ CORS blocked request from origin: ${origin}`);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

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
import uploadRoutes from "./routes/upload.routes";

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

app.use("/api/v1/upload", uploadRoutes);

// Health Check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "KitabGhor API চালু আছে 🚀" });
});

// Start with HTTP server (not app.listen)
httpServer.listen(PORT, () => {
  console.log(`✅ KitabGhor API running → http://localhost:${PORT}`);
});

export default app;