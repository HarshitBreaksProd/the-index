import { Router } from "express";
import {
  createTagController,
  getsTagByTitleController,
} from "../controllers/tag.controller";

const router: Router = Router();

router.route("/").post(createTagController);
router.route("/:keyword").get(getsTagByTitleController);

export default router;
