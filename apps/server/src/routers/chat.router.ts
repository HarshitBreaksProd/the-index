import { Router } from "express";
import {
  firstMessageController,
  userMessageController,
} from "../controllers/llm.controller";
import {
  createChatController,
  deleteChatController,
  editChatController,
  getChatsController,
} from "../controllers/chat.controller";

const router: Router = Router();

router.post("/first", firstMessageController);
router
  .route("/")
  .post(createChatController)
  .get(getChatsController)
  .put(editChatController);
router.delete("/:chatId", deleteChatController);
router.route("/query").post(userMessageController);

export default router;
