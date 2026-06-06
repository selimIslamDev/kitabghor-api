import { Router } from "express";
import {
  updateProfile,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getAddresses,
  addAddress,
  deleteAddress,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

// Profile
router.put("/me", updateProfile);

// Wishlist
router.get("/me/wishlist", getWishlist);
router.post("/me/wishlist/:productId", addToWishlist);
router.delete("/me/wishlist/:productId", removeFromWishlist);

// Address
router.get("/me/addresses", getAddresses);
router.post("/me/addresses", addAddress);
router.delete("/me/addresses/:id", deleteAddress);

export default router;