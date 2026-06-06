import { Router } from "express";
import { getProductReviews, createReview, deleteReview } from "../controllers/review.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/products/:id/reviews", getProductReviews);
router.post("/products/:id/reviews", authenticate, createReview);
router.delete("/:id", authenticate, deleteReview);

export default router;