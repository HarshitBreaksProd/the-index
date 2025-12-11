import { db } from "@repo/db";
import { chats } from "@repo/db/schemas";
import { createChatSchema, editChatSchema } from "@repo/zod-schema";
import { desc, eq } from "drizzle-orm";
import { Request, Response } from "express";

export const createChatController = async (req: Request, res: Response) => {
  try {
    const input = createChatSchema.safeParse(req.body);

    if (!input.success) {
      res.status(422).json({
        message: "Invalid Inputs",
        success: false,
      });
      return;
    }

    await db.insert(chats).values({
      indexId: input.data.indexId,
      title: input.data.title,
    });

    res.json({
      message: "New chat created successfully",
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Faced some internal server error",
      success: false,
    });
  }
};

export const editChatController = async (req: Request, res: Response) => {
  try {
    const inputs = editChatSchema.safeParse(req.body);

    if (!inputs.success) {
      res.status(422).json({
        message: "Invalid Inputs",
        success: false,
      });
      return;
    }

    await db.update(chats).set({ title: inputs.data.title });

    res.json({
      message: "Successfully updated chat",
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Faces some internal server error",
      success: false,
    });
  }
};

export const deleteChatController = async (req: Request, res: Response) => {
  try {
    const chatId = req.params.chatId;

    if (!chatId) {
      res.status(422).json({
        message: "Chat ID is required",
        success: false,
      });
      return;
    }

    await db.delete(chats).where(eq(chats.id, chatId));

    res.json({
      message: "Successfully deleted chat",
      success: true,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Faces some internal server error",
      success: false,
    });
  }
};

export const getChatsController = async (req: Request, res: Response) => {
  try {
    const indexId = req.params.indexId;

    if (!indexId) {
      res.status(422).json({
        message: "Index ID is required",
        success: false,
      });
      return;
    }

    const allIndexChats = await db
      .select()
      .from(chats)
      .where(eq(chats.indexId, indexId as string))
      .orderBy(desc(chats.createdAt));

    res.json({
      message: "Successfully fetched chats",
      success: true,
      allIndexChats: allIndexChats,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Faces some internal server error",
      success: false,
    });
  }
};
