import { Router } from "express";
import {
  getDashboard,
  getAnalytics,
  getAllOrders,
  updateOrderStatus,
  getAllUsers,
  getInventory,
  updateStock,
} from "../controllers/admin.controller";
import { authenticate, authorizeAdmin } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate, authorizeAdmin);

// Dashboard & Analytics
router.get("/dashboard", getDashboard);
router.get("/analytics", getAnalytics);

// Orders
router.get("/orders", getAllOrders);
router.patch("/orders/:id/status", updateOrderStatus);

// Users
router.get("/users", getAllUsers);

// Inventory
router.get("/inventory", getInventory);
router.patch("/inventory/:id/stock", updateStock);

export default router;