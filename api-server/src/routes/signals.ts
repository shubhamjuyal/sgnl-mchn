import { Hono } from "hono";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, signal, account } from "../db/index.js";

export const signalsRoutes = new Hono();

signalsRoutes.get("/", async (c) => {
  const tier = c.req.query("tier");
  const code = c.req.query("code");
  const accountId = c.req.query("accountId");
  const since = c.req.query("since"); // ISO datetime

  const conditions = [];
  if (tier) conditions.push(eq(signal.confidenceTier, tier as never));
  if (code) conditions.push(eq(signal.signalCode, code));
  if (accountId) conditions.push(eq(signal.accountId, Number(accountId)));
  if (since) conditions.push(gte(signal.signalDate, new Date(since)));

  const rows = await db
    .select({
      signal,
      accountName: account.displayName,
    })
    .from(signal)
    .leftJoin(account, eq(account.id, signal.accountId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(signal.scrapedAt))
    .limit(200);

  return c.json(rows);
});

signalsRoutes.get("/:signalId", async (c) => {
  const id = c.req.param("signalId");
  const [row] = await db.select().from(signal).where(eq(signal.signalId, id));
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

signalsRoutes.get("/_/stats", async (c) => {
  const [stats] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      candidate: sql<number>`COUNT(*) FILTER (WHERE confidence_tier = 'CANDIDATE')::int`,
      validated: sql<number>`COUNT(*) FILTER (WHERE confidence_tier = 'VALIDATED')::int`,
      confirmed: sql<number>`COUNT(*) FILTER (WHERE confidence_tier = 'CONFIRMED')::int`,
      blocked: sql<number>`COUNT(*) FILTER (WHERE is_guardrail_blocked = true)::int`,
    })
    .from(signal);
  return c.json(stats ?? {});
});
