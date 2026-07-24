import { Router } from "express";
import { getProductReviews, getFeaturedReviews, createReview, deleteReview } from "../controllers/review.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// IMPORTANT: featured route must come before the dynamic /:id delete route,
// and before /products/:id/reviews so "featured" is never mistaken for an id.
router.get("/reviews/featured", getFeaturedReviews);

router.get("/products/:id/reviews", getProductReviews);
router.post("/products/:id/reviews", authenticate, createReview);
router.delete("/:id", authenticate, deleteReview);

export default router;