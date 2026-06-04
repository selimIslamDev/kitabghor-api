import { Router } from "express";
import { createOrder, getOrder, getMyOrders } from "../controllers/order.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);
router.post("/", createOrder);
router.get("/my", getMyOrders);
router.get("/:id", getOrder);

export default router;
