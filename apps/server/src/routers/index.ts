import { Router } from "express";
import authRouter from "./auth.router";
import indexRouter from "./index.router";
import indexCardRouter from "./index_card.router";
import fileUploadRouter from "./file_upload.router";
import chatRouter from "./chat.router";
import tagRouter from "./tag.router";
import { authMiddleware } from "../middleware/auth.middleware";

const router: Router = Router();

router.use("/auth", authRouter);
router.use(authMiddleware);
router.use("/index", indexRouter);
router.use("/index_card", indexCardRouter);
router.use("/upload", fileUploadRouter);
router.use("/chat", chatRouter);
router.use("/tags", tagRouter);

export default router;
