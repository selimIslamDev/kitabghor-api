import { Router } from "express";
import { validateCoupon, getCoupons, createCoupon, toggleCoupon, deleteCoupon } from "../controllers/coupon.controller";
import { authenticate, authorizeAdmin } from "../middleware/auth.middleware";

const router = Router();

// Customer
router.post("/validate", validateCoupon);

// Admin only
router.get("/", authenticate, authorizeAdmin, getCoupons);
router.post("/", authenticate, authorizeAdmin, createCoupon);
router.patch("/:id/toggle", authenticate, authorizeAdmin, toggleCoupon);
router.delete("/:id", authenticate, authorizeAdmin, deleteCoupon);

export default router;