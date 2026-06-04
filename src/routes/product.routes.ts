import { Router } from "express";
import { getProducts, getProduct, searchProducts, getFeatured, getRelated } from "../controllers/product.controller";

const router = Router();

router.get("/", getProducts);
router.get("/search", searchProducts);
router.get("/featured", getFeatured);
router.get("/:id", getProduct);
router.get("/:id/related", getRelated);

export default router;
