import { db } from "@repo/db";
import { IndexCard, indexCards } from "@repo/db/schemas";
import { eq } from "drizzle-orm";
import { createTextEmbeddingsAndUpdateDbWithRetry } from "./textProcessor";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { fetchContentFromUrlWithRetry } from "./urlProcessor";
import { CONCURRENCY_INFO_TYPE } from "..";
import { processYoutubeLinkToAudioFile } from "./ytProcessor";
import { processAudioToText } from "./audioProcessor";
import fs from "fs";
import path from "path";
import os from "os";
import { pdfFileToText } from "./pdfProcessor";

export const processCard = async (
  cardId: string,
  CONCURRENCY_INFO: CONCURRENCY_INFO_TYPE
) => {
  let tempDir: string | null = null;
  let card: IndexCard | null = null;

  try {
    const dbSearch = await db
      .select()
      .from(indexCards)
      .where(eq(indexCards.id, cardId));

    if (!dbSearch[0]) {
      throw new Error(`Card with given id not found, Id: ${cardId}`);
    }

    card = dbSearch[0];

    switch (card.type) {
      case "text":
        await createTextEmbeddingsAndUpdateDbWithRetry(card.source, card.id);
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
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), cardId));
        const audioFile = await processYoutubeLinkToAudioFile(
          card.source,
          tempDir
        );
        if (audioFile === undefined) {
          throw new Error(
            "Yt Url processing did not happen correctly, audioFile undefined"
          );
        }
        const captions = await processAudioToText(audioFile);
        if (captions === undefined) {
          throw new Error(
            "Audio processing did not happen correctly, audioFile undefined"
          );
        }
        await createTextEmbeddingsAndUpdateDbWithRetry(captions, cardId);
        break;

      case "pdf":
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), cardId));
        const text = await pdfFileToText(card.source);
        if (text === undefined) {
          throw new Error(
            "Url processing did not happen correctly, textContent undefined"
          );
        }
        await createTextEmbeddingsAndUpdateDbWithRetry(text, cardId);
        break;

      case "audio":
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), cardId));
        break;

      case "spotify":
        console.log("Spotify exists only for aesthetic purposes for frontend");
        break;
    }
    CONCURRENCY_INFO.activeJobs -= 1;
    cleanupTempFolder(tempDir);

    console.log(CONCURRENCY_INFO, "CARD PROCESSING FINISHED");
  } catch (err) {
    CONCURRENCY_INFO.activeJobs -= 1;
    cleanupTempFolder(tempDir);

    console.log(err);
    console.log("Error occured in processCard ^^^^^^^^^^^^^^^^^^^^^^^^^");
  }
};

export const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 150,
});

const cleanupTempFolder = (tempDir: string | null) => {
  console.log(tempDir);

  if (tempDir && fs.existsSync(tempDir)) {
    console.log("Temp dir found", tempDir);
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log("Temp folder cleanup done");
  }
};
