import { Router } from "express";
import {
  signinController,
  signupController,
} from "../controllers/auth.controller";

const router: Router = Router();

router.route("/signup").post(signupController);
router.route("/signin").post(signinController);

export default router;
