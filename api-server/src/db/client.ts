import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL must be set");
}

// Pool sized for serverless: each Vercel Function instance opens its own pool,
// so keep it tiny and rely on a pooled DATABASE_URL (Neon / PgBouncer / Supabase
// pooler) upstream rather than direct Postgres connections.
const sql = postgres(url, { max: 1, prepare: false });
export const db = drizzle(sql, { schema });
export { sql };
export type DB = typeof db;
