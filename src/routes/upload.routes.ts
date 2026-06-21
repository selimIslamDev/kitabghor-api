import { Router } from "express";
import { uploadImage, deleteImage } from "../controllers/upload.controller";
import { authenticate, authorizeAdmin } from "../middleware/auth.middleware";
import { upload } from "../config/cloudinary";

const router = Router();

router.post("/", authenticate, authorizeAdmin, upload.single("image"), uploadImage);
router.delete("/", authenticate, authorizeAdmin, deleteImage);

export default router;