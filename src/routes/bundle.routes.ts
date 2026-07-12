import { Router } from "express";
import {
  getBundles,
  getBundle,
  createBundle,
  updateBundle,
  deleteBundle,
} from "../controllers/bundle.controller";
import { authenticate, authorizeAdmin } from "../middleware/auth.middleware";

const router = Router();

// Public
router.get("/", getBundles);
router.get("/:id", getBundle);

// Admin only
router.post("/", authenticate, authorizeAdmin, createBundle);
router.put("/:id", authenticate, authorizeAdmin, updateBundle);
router.delete("/:id", authenticate, authorizeAdmin, deleteBundle);

export default router;