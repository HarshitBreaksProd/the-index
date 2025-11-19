import { db } from "@repo/db";
import { splitter } from ".";
import { getEmbeddings } from "./embedder";
import { cardChunks } from "@repo/db/schemas";

export const textProcessor = async (sourceText: string, cardId: string) => {
  const chunks = await splitter.splitText(sourceText);

  console.log(chunks);

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
    const dbInsertResult = await db
      .insert(cardChunks)
      .values(cardChunksToInsert);

    console.log(dbInsertResult.rowCount, " rows created in card chunks table");
  } catch (err) {
    console.log(err);
    console.log("Insertion for card chunks failed");
  }
};
