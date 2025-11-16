import { Router } from "express";
import { createIndexCardController } from "../controllers/index_card.controller";

const router: Router = Router();

router.route("/:indexId").post(createIndexCardController);

export default router;
