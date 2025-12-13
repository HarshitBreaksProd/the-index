import { db } from "@repo/db";
import { IndexCard, indexCards } from "@repo/db/schemas";
import { eq } from "drizzle-orm";
import { createTextEmbeddingsAndUpdateDbWithRetry } from "./textProcessor";
import { fetchContentFromUrlWithRetry } from "./urlProcessor";
import { CONCURRENCY_INFO_TYPE } from "..";
import { processYoutubeLinkToAudioFile } from "./ytProcessor";
import {
  downloadAndProcessAudioFromS3,
  processAudioToText,
} from "./audioProcessor";
import fs from "fs";
import path from "path";
import os from "os";
import { pdfFileToText } from "./pdfProcessor";

export const processCard = async (
  cardId: string,
  cardType: string,
  CONCURRENCY_INFO: CONCURRENCY_INFO_TYPE
) => {
  let tempDir: string | null = null;
  let card: IndexCard | null = null;

  try {
    let dbSearch: IndexCard[] | undefined = undefined;

    try {
      dbSearch = await db
        .update(indexCards)
        .set({
          status: "processing",
        })
        .where(eq(indexCards.id, cardId))
        .returning();
    } catch (err) {
      throw { errorMessage: "Database query failed to update card status" };
    }

    if (!dbSearch || !dbSearch[0]) {
      throw { errorMessage: `Card with given id not found, Id: ${cardId}` };
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
          throw {
            errorMessage:
              "Url processing did not happen correctly, textContent undefined",
          };
        }
        await createTextEmbeddingsAndUpdateDbWithRetry(textContent, cardId);
        break;

      case "youtube":
        console.log(
          `[Worker-Utils] Processing YouTube card ${cardId}. Source: ${card.source}`
        );
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), cardId));
        console.log(`[Worker-Utils] Created temp directory: ${tempDir}`);
        const audioFile = await processYoutubeLinkToAudioFile(
          card.source,
          tempDir
        );
        if (audioFile === undefined) {
          throw {
            errorMessage:
              "Yt Url processing did not happen correctly, audioFile undefined",
          };
        }
        console.log(
          `[Worker-Utils] Audio file downloaded. Processing audio to text...`
        );
        const captions = await processAudioToText(audioFile);
        if (captions === undefined) {
          throw {
            errorMessage:
              "Audio processing did not happen correctly, audioFile undefined",
          };
        }
        console.log(
          `[Worker-Utils] Captions generated. Creating embeddings...`
        );
        await createTextEmbeddingsAndUpdateDbWithRetry(captions, cardId);
        console.log(`[Worker-Utils] Embeddings created.`);
        break;

      case "pdf":
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), cardId));
        const pdfText = await pdfFileToText(card.source);
        if (pdfText === undefined) {
          throw {
            errorMessage:
              "Pdf processing did not happen correctly, pdfText undefined",
          };
        }
        await createTextEmbeddingsAndUpdateDbWithRetry(pdfText, cardId);
        break;

      case "audio":
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), cardId));
        const audioText = await downloadAndProcessAudioFromS3(
          card.source,
          tempDir
        );
        if (audioText === undefined) {
          throw {
            errorMessage:
              "Audio processing did not happen correctly, audioText undefined",
          };
        }
        await createTextEmbeddingsAndUpdateDbWithRetry(audioText, cardId);
        break;

      case "spotify":
        console.log("Spotify exists only for aesthetic purposes for frontend");
        break;
    }
    if (cardType === "youtube" || cardType === "audio") {
      CONCURRENCY_INFO.activeJobs -= 10;
    } else {
      CONCURRENCY_INFO.activeJobs -= 1;
    }
    cleanupTempFolder(tempDir);

    console.log(CONCURRENCY_INFO, "CARD PROCESSING FINISHED");

    try {
      await db
        .update(indexCards)
        .set({
          status: "completed",
        })
        .where(eq(indexCards.id, cardId));
    } catch (err) {
      console.error(
        `Error updating db with completed status for card ${cardId}`,
        err
      );
    }
  } catch (err) {
    if (cardType === "youtube" || cardType === "audio") {
      CONCURRENCY_INFO.activeJobs -= 10;
    } else {
      CONCURRENCY_INFO.activeJobs -= 1;
    }
    cleanupTempFolder(tempDir);

    const errorMessage = (err as { errorMessage: string }).errorMessage;

    try {
      await db
        .update(indexCards)
        .set({
          errorMessage: errorMessage,
          status: "failed",
        })
        .where(eq(indexCards.id, cardId));
    } catch (err) {
      console.error("Error updating db with error message", err);
    }
  }
};

const cleanupTempFolder = (tempDir: string | null) => {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};
