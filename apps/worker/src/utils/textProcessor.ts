import { db } from "@repo/db";
import { splitter } from ".";
import { getEmbeddings } from "./embedder";
import { cardChunks, indexCards } from "@repo/db/schemas";
import { eq } from "drizzle-orm";

export const createTextEmbeddingsAndUpdateDb = async (
  sourceText: string,
  cardId: string
) => {
  try {
    const chunks = await splitter.splitText(sourceText);
    const embedding = await getEmbeddings(chunks);

    const cardChunksToInsert: {
      cardId: string;
      chunkText: string;
      embedding: number[];
      order: number;
    }[] = [];

    for (let i = 0; i < chunks.length; i++) {
      cardChunksToInsert.push({
        cardId,
        chunkText: chunks[i]!,
        embedding: Array.from(embedding[i]!),
        order: i + 1,
      });
    }

    try {
      await db.transaction(async (tx) => {
        const dbInsertResult = await tx
          .insert(cardChunks)
          .values(cardChunksToInsert);

        await tx
          .update(indexCards)
          .set({ processedContent: sourceText, status: "completed" })
          .where(eq(indexCards.id, cardId));
      });
    } catch (err) {
      throw { errorMessage: "Text Embedding could not be created." };
    }
  } catch (err) {
    const errorMessage = (err as { errorMessage: string }).errorMessage;
    throw errorMessage
      ? { errorMessage }
      : { errorMessage: "Text Embedding could not be created." };
  }
};

export const createTextEmbeddingsAndUpdateDbWithRetry = async (
  sourceText: string,
  cardId: string,
  maxAttempts: number = 3
) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await createTextEmbeddingsAndUpdateDb(sourceText, cardId);
      return;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
};
