import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL must be set");
}

// Single shared connection per process. Pool sized small for MVP.
const sql = postgres(url, { max: 10, prepare: false });
export const db = drizzle(sql, { schema });
export { sql };
export type DB = typeof db;
