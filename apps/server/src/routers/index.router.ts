import { Router } from "express";
import { createIndexController } from "../controllers/index.controller";

const router: Router = Router();

router.route("/").post(createIndexController);

export default router;
