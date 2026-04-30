import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL must be set");
}

const sql = postgres(url, { max: 1, prepare: false });
const db = drizzle(sql);

console.log("Running migrations...");
await migrate(db, { migrationsFolder: "./migrations" });
console.log("Migrations complete.");

await sql.end();
