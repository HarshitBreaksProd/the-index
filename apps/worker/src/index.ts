import { RedisClient, redisClient } from "@repo/redis";
import { processCard } from "./utils";
import { gracefulShutDownOfBrowser } from "./utils/urlProcessor";
import path from "path";
import os from "os";
import fs from "fs";

checkForAllEnvVars();

export const workerRedisClient: RedisClient = redisClient.duplicate();

const STREAM_NAME = "card_created";
const CONSUMER_GROUP = "card_processor_group";
const CONCURRENCY_INFO = {
  activeJobs: 0,
  limit: 10,
};
let shouldExit = false;

export type CONCURRENCY_INFO_TYPE = typeof CONCURRENCY_INFO;

const main = async () => {
  workerRedisClient.on("error", (err) => {
    console.error("Redis client error in worker", err);
  });
  await workerRedisClient.connect();
  console.log("Redis connected in worker");

  try {
    await workerRedisClient.xGroupCreate(STREAM_NAME, CONSUMER_GROUP, "0", {
      MKSTREAM: true,
    });
  } catch (err) {
    console.log("Redis consumer group already exists");
  }

  while (!shouldExit) {
    if (CONCURRENCY_INFO.activeJobs < CONCURRENCY_INFO.limit) {
      const streams = await workerRedisClient.xReadGroup(
        CONSUMER_GROUP,
        `consumer-${process.pid}`,
        { key: STREAM_NAME, id: ">" },
        { COUNT: 1, BLOCK: 1 }
      );

      if (streams && streams[0]) {
        const stream = streams![0];

        for (const message of stream?.messages!) {
          const id = message.id;
          await workerRedisClient.xAck(STREAM_NAME, CONSUMER_GROUP, id);

          const cardId = message.message.card_id;
          if (cardId) {
            CONCURRENCY_INFO.activeJobs += 1;
            console.log(CONCURRENCY_INFO, "CARD PROCESSING START");
            processCard(cardId, CONCURRENCY_INFO);
          }
        }
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
};

main();

function emptyDirSync(dirPath: string) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
  }
  console.log("Cleared the temp directory");
}

const gracefulShutDownCleanUp = async () => {
  console.log("Recieved SIGINT/SIGTERM, closing gracefully");
  shouldExit = true;
  await workerRedisClient.quit();
  console.log("Redis client closed");
  await gracefulShutDownOfBrowser();

  const osTempDir = os.tmpdir();
  emptyDirSync(osTempDir);

  process.exit(0);
};

process.on("SIGTERM", gracefulShutDownCleanUp);
process.on("SIGINT", gracefulShutDownCleanUp);

function checkForAllEnvVars() {
  const {
    REDIS_URL,
    DATABASE_URL,
    AWS_REGION,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    S3_BUCKET,
  } = process.env;

  if (
    !REDIS_URL ||
    !DATABASE_URL ||
    !AWS_REGION ||
    !AWS_ACCESS_KEY_ID ||
    !AWS_SECRET_ACCESS_KEY ||
    !S3_BUCKET
  ) {
    throw new Error("Missing environment variables");
  }
}
