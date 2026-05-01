import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  SIGNALS,
  GUARDRAILS,
  ARCHETYPES,
  PROGRAMS,
  ARCHETYPE_PROGRAM_MAPPING,
  SOURCES,
  ROUTING_RULES,
  SAMPLE_ACCOUNTS,
} from "../config-defaults/index.js";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL must be set");

const sql = postgres(url, { max: 1, prepare: false });
const db = drizzle(sql, { schema });

async function main() {
  console.log("Seeding archetypes...");
  for (const a of ARCHETYPES) {
    await db.insert(schema.archetype).values(a).onConflictDoUpdate({
      target: schema.archetype.code,
      set: a,
    });
  }

  console.log("Seeding programs...");
  for (const p of PROGRAMS) {
    await db.insert(schema.programCatalog).values(p).onConflictDoUpdate({
      target: schema.programCatalog.programId,
      set: p,
    });
  }

  console.log("Seeding signal dictionary...");
  for (const s of SIGNALS) {
    await db.insert(schema.signalDictionary).values(s).onConflictDoUpdate({
      target: schema.signalDictionary.code,
      set: s,
    });
  }

  console.log("Seeding guardrails...");
  for (const g of GUARDRAILS) {
    await db.insert(schema.guardrailRule).values(g).onConflictDoUpdate({
      target: schema.guardrailRule.ruleCode,
      set: g,
    });
  }

  console.log("Seeding archetype-program mappings...");
  for (const m of ARCHETYPE_PROGRAM_MAPPING) {
    await db.insert(schema.archetypeProgramMapping).values(m).onConflictDoUpdate({
      target: [schema.archetypeProgramMapping.archetypeCode, schema.archetypeProgramMapping.signalCode],
      set: m,
    });
  }

  console.log("Seeding sources...");
  for (const s of SOURCES) {
    await db.insert(schema.source).values(s).onConflictDoUpdate({
      target: schema.source.sourceName,
      set: { ...s, updatedAt: new Date() },
    });
  }

  console.log("Seeding routing rules (truncate + reload)...");
  await db.delete(schema.routingRule);
  for (const r of ROUTING_RULES) {
    await db.insert(schema.routingRule).values(r);
  }

  console.log("Seeding scoring + tier config (single row)...");
  const existingScoring = await db.select().from(schema.scoringConfig);
  if (existingScoring.length === 0) {
    await db.insert(schema.scoringConfig).values({});
  }
  const existingTier = await db.select().from(schema.confidenceTierRule);
  if (existingTier.length === 0) {
    await db.insert(schema.confidenceTierRule).values({
      validatedAlternateSignalCodes: ["V1", "V2", "V3"],
      velocitySources: ["google_trends", "tiktok"],
      requireVelocity: false, // MVP: GT deferred. Flip when wired.
    });
  }

  console.log("Seeding sample accounts...");
  for (const a of SAMPLE_ACCOUNTS) {
    await db.insert(schema.account).values(a).onConflictDoNothing({
      target: schema.account.displayName,
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => sql.end());
