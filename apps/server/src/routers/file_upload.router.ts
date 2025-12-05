import { Router } from "express";
import { createPreSignedUrl } from "../controllers/file_upload.controller";

const router: Router = Router();

router.post("/create", createPreSignedUrl);

export default router;
