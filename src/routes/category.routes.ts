// import { Router } from "express";
// const router = Router();
// // TODO: category routes
// export default router;
import { Router } from "express";
import {
  getCategories,
  getCategoryProducts,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller";
import { authenticate, authorizeAdmin } from "../middleware/auth.middleware";

const router = Router();

router.get("/", getCategories);
router.get("/:id/products", getCategoryProducts);

// Admin only
router.post("/", authenticate, authorizeAdmin, createCategory);
router.put("/:id", authenticate, authorizeAdmin, updateCategory);
router.delete("/:id", authenticate, authorizeAdmin, deleteCategory);

export default router;