import { Hono } from "hono";
import { db, guardrailRule, guardrailEventLog } from "@sgnl/db";
import { desc } from "drizzle-orm";

export const guardrailsRoutes = new Hono();

guardrailsRoutes.get("/", async (c) => {
  const rows = await db.select().from(guardrailRule).orderBy(guardrailRule.ruleCode);
  return c.json(rows);
});

guardrailsRoutes.get("/events", async (c) => {
  const rows = await db.select().from(guardrailEventLog).orderBy(desc(guardrailEventLog.at)).limit(200);
  return c.json(rows);
});
