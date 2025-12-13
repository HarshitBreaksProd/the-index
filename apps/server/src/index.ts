import express from "express";
import "dotenv/config";
import cors from "cors";
import router from "./routers";
import cookieParser from "cookie-parser";
import { RedisClient, redisClient } from "@repo/redis";

checkForAllEnvVars();

const HTTP_PORT = process.env.HTTP_PORT;
const FRONTEND_URL = process.env.FRONTEND_URL;

export const expressRedisClient: RedisClient = redisClient.duplicate();

(async () => {
  expressRedisClient.on("error", (err) => {
    console.error("Redis client error in express server", err);
  });
  await expressRedisClient.connect();
  console.log("Redis connected in express server");
})();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use("/health", async (req: express.Request, res: express.Response) => {
  res.send("Healthy");
});
app.use("/api/v1", router);

app.listen(HTTP_PORT, () => {
  console.log("Express server running on port ", HTTP_PORT);
});

function checkForAllEnvVars() {
  const {
    HTTP_PORT,
    FRONTEND_URL,
    SALTROUNDS,
    JWT_SECRET,
    DATABASE_URL,
    REDIS_URL,
    AWS_REGION,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    S3_BUCKET,
    GEMINI_API_KEY,
    OPENAI_API_KEY,
  } = process.env;

  if (
    !HTTP_PORT ||
    !FRONTEND_URL ||
    !SALTROUNDS ||
    !JWT_SECRET ||
    !DATABASE_URL ||
    !REDIS_URL ||
    !AWS_REGION ||
    !AWS_ACCESS_KEY_ID ||
    !AWS_SECRET_ACCESS_KEY ||
    !S3_BUCKET ||
    !GEMINI_API_KEY ||
    !OPENAI_API_KEY
  ) {
    throw new Error("Missing environment variables");
  }
}
