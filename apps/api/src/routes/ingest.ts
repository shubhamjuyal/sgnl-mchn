import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, rawData, source, account } from "@sgnl/db";
import { bus } from "@sgnl/bus";
import { log } from "../lib/log.js";

export const ingestRoutes = new Hono();

const manualSchema = z.object({
  accountId: z.number().int().positive(),
  content: z.string().min(1),
  url: z.string().url().optional(),
  postedAt: z.string().datetime().optional(),
  nativeId: z.string().optional(),
  signalCodeHints: z.array(z.string()).optional(), // optional — detection still runs phrase match
  sourceMeta: z.record(z.unknown()).optional(),
});

ingestRoutes.post("/manual", zValidator("json", manualSchema), async (c) => {
  const body = c.req.valid("json");

  // Look up the manual source
  const [manualSrc] = await db.select().from(source).where(eq(source.sourceName, "manual"));
  if (!manualSrc) return c.json({ error: "manual source not configured" }, 500);
  if (manualSrc.status !== "ACTIVE") return c.json({ error: "manual source not ACTIVE" }, 400);

  // Confirm account exists and is classifiable (GR-08)
  const [acct] = await db.select().from(account).where(eq(account.id, body.accountId));
  if (!acct) return c.json({ error: "account not found" }, 404);
  if (!acct.archetype) {
    return c.json({ error: "account not classified (GR-08)", account: acct }, 422);
  }

  const contentHash = createHash("sha256").update(body.content).digest("hex");
  const nativeId = body.nativeId ?? `manual-${contentHash.slice(0, 16)}`;

  const [row] = await db
    .insert(rawData)
    .values({
      sourceId: manualSrc.id,
      accountId: body.accountId,
      nativeId,
      content: body.content,
      url: body.url,
      postedAt: body.postedAt ? new Date(body.postedAt) : new Date(),
      contentHash,
      sourceMeta: { ...(body.sourceMeta ?? {}), manualHints: body.signalCodeHints },
    })
    .onConflictDoNothing({ target: [rawData.sourceId, rawData.nativeId] })
    .returning();

  if (!row) {
    return c.json({ error: "duplicate raw_data (sourceId, nativeId)" }, 409);
  }

  await bus.enqueue("detect", { rawDataId: row.id });
  log.info({ rawDataId: row.id, accountId: body.accountId }, "manual ingest");

  return c.json({ rawDataId: row.id, ok: true });
});

// Apify webhook stub — accepts the run completion event, will be wired later
ingestRoutes.post("/apify-webhook", async (c) => {
  const body = await c.req.json();
  log.info({ runId: body?.eventData?.actorRunId }, "apify webhook received (not yet implemented)");
  return c.json({ ok: true, processed: false, reason: "apify integration deferred" });
});

// Playwright result stub — accepts a payload from a Playwright worker run
ingestRoutes.post("/playwright-result", async (c) => {
  const body = await c.req.json();
  log.info({ url: body?.url }, "playwright result received (not yet implemented)");
  return c.json({ ok: true, processed: false, reason: "playwright pipeline deferred" });
});
