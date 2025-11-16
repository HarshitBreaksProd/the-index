import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not found in env");
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle({ client: sql });
