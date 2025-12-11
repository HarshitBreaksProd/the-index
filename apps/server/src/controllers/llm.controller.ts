import { firstMessageSchema, userMessageSchema } from "@repo/zod-schema";
import { Request, Response } from "express";
import {
  fetchContextFromIndex,
  openAi,
  populatePromptWithContextAndQuery,
} from "../utils/llm";
import { db } from "@repo/db";
import { chatMessages, chats, messageCitations } from "@repo/db/schemas";
import { desc, eq } from "drizzle-orm";

export const firstMessageController = async (req: Request, res: Response) => {
  try {
    const input = firstMessageSchema.safeParse(req.body);

    if (!input.success) {
      res.status(422).json({
        message: "Invalid inputs",
        success: false,
      });
      return;
    }

    await db.transaction(async (tx) => {
      const [chat] = await tx
        .insert(chats)
        .values({
          indexId: input.data.indexId,
          title: input.data.content.slice(0, 15),
        })
        .returning();

      const { context, cardsReferenced } = await fetchContextFromIndex(
        chat!.id,
        input.data.content,
        tx
      );

      const populatedPrompt = populatePromptWithContextAndQuery(
        context,
        input.data.content
      );

      let aiResponse = "";

      // GEMINI AI CODE
      // const stream = await geminiAi.generateContentStream(populatedPrompt);

      // let responseChunk:
      //   | IteratorResult<GenerateContentResponse, any>
      //   | undefined;

      // while (!responseChunk?.done) {
      //   responseChunk = await stream.next();
      //   if (
      //     responseChunk.value &&
      //     responseChunk.value.candidates &&
      //     responseChunk.value.candidates[0] &&
      //     responseChunk.value.candidates[0].content.parts &&
      //     responseChunk.value.candidates[0].content.parts[0] &&
      //     responseChunk.value.candidates[0].content.parts[0].text
      //   ) {
      //     console.log(
      //       typeof responseChunk.value.candidates[0]?.content.parts[0]?.text
      //     );

      //     res.write(responseChunk.value.candidates[0]?.content.parts[0]?.text);
      //   }
      // }

      const stream = await openAi.generateContentStream(populatedPrompt);

      for await (const event of stream) {
        if ((event.type = "response.output_text.delta")) {
          if (typeof (event as { delta: string }).delta === "string") {
            aiResponse += (event as { delta: string }).delta;
            res.write((event as { delta: string }).delta);
          }
        }
      }

      await tx.insert(chatMessages).values({
        chatId: chat!.id,
        role: "user",
        content: input.data.content,
      });

      const [aiMessage] = await tx
        .insert(chatMessages)
        .values({
          chatId: chat!.id,
          role: "assistant",
          content: aiResponse,
        })
        .returning();

      if (cardsReferenced.length > 0) {
        for await (const cardId of cardsReferenced) {
          await tx.insert(messageCitations).values({
            chatMessageId: aiMessage!.id,
            indexCardId: cardId,
          });
        }
      }
    });
    res.end();
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Faced some internal server error",
      success: false,
    });
  }
};

export const userMessageController = async (req: Request, res: Response) => {
  try {
    const input = userMessageSchema.safeParse(req.body);

    if (!input.success) {
      res.status(422).json({
        message: "Invalid inputs",
        success: false,
      });
      return;
    }

    await db.transaction(async (tx) => {
      const { context, cardsReferenced } = await fetchContextFromIndex(
        input.data.chatId,
        input.data.content,
        tx
      );

      const chatHistoryInverted = await tx
        .select({
          role: chatMessages.role,
          content: chatMessages.content,
          sequenceId: chatMessages.sequenceId,
        })
        .from(chatMessages)
        .where(eq(chatMessages.chatId, input.data.chatId))
        .orderBy(desc(chatMessages.sequenceId))
        .limit(10);

      let chatHistory = chatHistoryInverted.reverse();

      let chatHistoryString: string = "";

      chatHistory.map((message) => {
        chatHistoryString += JSON.stringify(message) + "\n\n";
      });

      const populatedPrompt = populatePromptWithContextAndQuery(
        context,
        input.data.content,
        chatHistoryString
      );

      let aiResponse = "";

      const stream = await openAi.generateContentStream(populatedPrompt);

      for await (const event of stream) {
        if ((event.type = "response.output_text.delta")) {
          if (typeof (event as { delta: string }).delta === "string") {
            aiResponse += (event as { delta: string }).delta;
            res.write((event as { delta: string }).delta);
          }
        }
      }

      await tx.insert(chatMessages).values({
        chatId: input.data.chatId,
        role: "user",
        content: input.data.content,
      });

      const [aiMessage] = await tx
        .insert(chatMessages)
        .values({
          chatId: input.data.chatId,
          role: "assistant",
          content: aiResponse,
        })
        .returning();

      if (cardsReferenced.length > 0) {
        for await (const cardId of cardsReferenced) {
          await tx.insert(messageCitations).values({
            chatMessageId: aiMessage!.id,
            indexCardId: cardId,
          });
        }
      }
    });
    res.end();
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Faced some internal server error",
      success: false,
    });
  }
};
