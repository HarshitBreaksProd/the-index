import { Router } from "express";
import authRouter from "./auth.router";
import indexRouter from "./index.router";
import indexCardRouter from "./index_card.router";
import fileUploadRouter from "./file_upload.router";
import { authMiddleware } from "../middleware/auth.middleware";

const router: Router = Router();

router.use("/auth", authRouter);
router.use(authMiddleware);
router.use("/index", indexRouter);
router.use("/index_card", indexCardRouter);
router.use("/upload", fileUploadRouter);

export default router;
