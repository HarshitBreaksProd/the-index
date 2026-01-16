import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  signinController,
  signupController,
} from "../controllers/auth.controller";

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message:
    "Too many login/signup attempts from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

const router: Router = Router();

router.route("/signup").post(authRateLimiter, signupController);
router.route("/signin").post(authRateLimiter, signinController);

export default router;
