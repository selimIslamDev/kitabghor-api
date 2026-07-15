import { Router } from "express";
import {
  initiateSSLCommerzPayment,
  sslcommerzSuccess,
  sslcommerzFail,
  sslcommerzCancel,
  sslcommerzIPN,
} from "../controllers/payment.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/sslcommerz/initiate/:orderId", authenticate, initiateSSLCommerzPayment);

router.post("/sslcommerz/success", sslcommerzSuccess);
router.post("/sslcommerz/fail", sslcommerzFail);
router.post("/sslcommerz/cancel", sslcommerzCancel);
router.post("/sslcommerz/ipn", sslcommerzIPN);

export default router;