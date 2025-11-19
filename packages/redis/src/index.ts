import { createClient, RedisClientType } from "redis";
import "dotenv/config";

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  throw new Error("Env, redis url not set in redis package");
}

export const redisClient: RedisClientType = createClient({
  url: REDIS_URL,
});

export type RedisClient = RedisClientType;
