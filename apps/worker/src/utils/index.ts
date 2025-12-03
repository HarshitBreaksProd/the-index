import { db } from "@repo/db";
import { indexCards } from "@repo/db/schemas";
import { eq } from "drizzle-orm";
import { createTextEmbeddingsAndUpdateDbWithRetry } from "./textProcessor";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { fetchContentFromUrlWithRetry } from "./urlProcessor";
import { CONCURRENCY_INFO_TYPE } from "..";

export const processCard = async (
  cardId: string,
  CONCURRENCY_INFO: CONCURRENCY_INFO_TYPE
) => {
  try {
    const dbSearch = await db
      .select()
      .from(indexCards)
      .where(eq(indexCards.id, cardId));

    if (!dbSearch[0]) {
      throw new Error(`Card with given id not found, Id: ${cardId}`);
    }

    const card = dbSearch[0];

    switch (card.type) {
      case "text":
        await createTextEmbeddingsAndUpdateDbWithRetry(card.source, card.id);
        break;
      case "pdf":
        break;
      case "url":
      case "tweet":
        const textContent: string | undefined =
          await fetchContentFromUrlWithRetry(card.source);
        if (textContent === undefined) {
          throw new Error(
            "Url processing did not happen correctly, textContent undefined"
          );
        }
        await createTextEmbeddingsAndUpdateDbWithRetry(textContent, cardId);
        break;
      case "youtube":
        break;
      case "spotify":
        break;
    }
    CONCURRENCY_INFO.activeJobs -= 1;
    console.log(CONCURRENCY_INFO, "CARD PROCESSING FINISHED");
  } catch (err) {
    CONCURRENCY_INFO.activeJobs -= 1;
    console.log(err);
    console.log("Error occured in processCard ^^^^^^^^^^^^^^^^^^^^^^^^^");
  }
};

export const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 150,
});
