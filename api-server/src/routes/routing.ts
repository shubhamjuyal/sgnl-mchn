import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, routingLog, outreachDraft, account } from "../db/index.js";

export const routingRoutes = new Hono();

routingRoutes.get("/log", async (c) => {
  const dest = c.req.query("destination");
  const rows = await db
    .select()
    .from(routingLog)
    .where(dest ? eq(routingLog.destination, dest as never) : undefined)
    .orderBy(desc(routingLog.at))
    .limit(200);
  return c.json(rows);
});

routingRoutes.get("/queue/:destination", async (c) => {
  const dest = c.req.param("destination") as never;
  const rows = await db
    .select({
      draft: outreachDraft,
      accountName: account.displayName,
      archetype: account.archetype,
    })
    .from(outreachDraft)
    .leftJoin(account, eq(account.id, outreachDraft.accountId))
    .where(eq(outreachDraft.destination, dest))
    .orderBy(desc(outreachDraft.createdAt))
    .limit(200);
  return c.json(rows);
});

routingRoutes.post(
  "/draft/:draftId/approve",
  zValidator("json", z.object({ approvedBy: z.string().email() })),
  async (c) => {
    const draftId = c.req.param("draftId");
    const { approvedBy } = c.req.valid("json");
    const [row] = await db
      .update(outreachDraft)
      .set({ status: "approved", approvedBy, approvedAt: new Date() })
      .where(eq(outreachDraft.draftId, draftId))
      .returning();
    if (!row) return c.json({ error: "not found" }, 404);
    return c.json(row);
  },
);

routingRoutes.post(
  "/draft/:draftId/discard",
  zValidator("json", z.object({ reason: z.string() })),
  async (c) => {
    const draftId = c.req.param("draftId");
    const [row] = await db
      .update(outreachDraft)
      .set({ status: "discarded" })
      .where(eq(outreachDraft.draftId, draftId))
      .returning();
    if (!row) return c.json({ error: "not found" }, 404);
    return c.json(row);
  },
);
