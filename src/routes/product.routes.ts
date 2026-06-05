import { Router } from "express";
import {
  getProducts,
  getProduct,
  searchProducts,
  getFeatured,
  getRelated,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";
import { authenticate, authorizeAdmin } from "../middleware/auth.middleware";
 
const router = Router();
 
// Public
router.get("/", getProducts);
router.get("/search", searchProducts);
router.get("/featured", getFeatured);
router.get("/:id", getProduct);
router.get("/:id/related", getRelated);
 
// Admin only
router.post("/", authenticate, authorizeAdmin, createProduct);
router.put("/:id", authenticate, authorizeAdmin, updateProduct);
router.delete("/:id", authenticate, authorizeAdmin, deleteProduct);
 
export default router;
 