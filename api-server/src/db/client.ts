import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema.js";

// Pool sized for serverless: each Vercel Function instance opens its own pool,
// so keep it tiny and rely on a pooled DATABASE_URL (Neon / PgBouncer / Supabase
// pooler) upstream rather than direct Postgres connections.
let _sql: Sql | undefined;
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

function init() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL must be set");
  }
  _sql = postgres(url, { max: 1, prepare: false });
  _db = drizzle(_sql, { schema });
}

export const sql: Sql = new Proxy({} as Sql, {
  get(_t, prop, receiver) {
    if (!_sql) init();
    return Reflect.get(_sql as object, prop, receiver);
  },
  apply(_t, thisArg, args) {
    if (!_sql) init();
    return Reflect.apply(_sql as unknown as Function, thisArg, args);
  },
}) as Sql;

export const db: ReturnType<typeof drizzle<typeof schema>> = new Proxy(
  {} as ReturnType<typeof drizzle<typeof schema>>,
  {
    get(_t, prop, receiver) {
      if (!_db) init();
      return Reflect.get(_db as object, prop, receiver);
    },
  },
);

export type DB = typeof db;
