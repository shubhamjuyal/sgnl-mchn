import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, source } from "@sgnl/db";
import { bus } from "@sgnl/bus";

export const sourcesRoutes = new Hono();

sourcesRoutes.get("/", async (c) => {
  const rows = await db.select().from(source).orderBy(source.id);
  return c.json(rows);
});

sourcesRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [row] = await db.select().from(source).where(eq(source.id, id));
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

const updateSchema = z
  .object({
    status: z.enum(["ACTIVE", "PARTIAL", "PENDING", "DISABLED"]).optional(),
    cronExpression: z.string().nullable().optional(),
    targetScope: z.record(z.unknown()).optional(),
    accountQualityFilter: z.record(z.unknown()).optional(),
    updateFrequency: z.string().optional(),
    geographicFilter: z.string().optional(),
    signalJustification: z.string().optional(),
    limitations: z.string().optional(),
  })
  .strict();

sourcesRoutes.patch("/:id", zValidator("json", updateSchema), async (c) => {
  const id = Number(c.req.param("id"));
  const patch = c.req.valid("json");
  const [updated] = await db
    .update(source)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(source.id, id))
    .returning();
  if (!updated) return c.json({ error: "not found" }, 404);
  return c.json(updated);
});

sourcesRoutes.post("/:id/run-now", async (c) => {
  const id = Number(c.req.param("id"));
  const [src] = await db.select().from(source).where(eq(source.id, id));
  if (!src) return c.json({ error: "not found" }, 404);

  const map: Record<string, "scrape.instagram" | "scrape.website" | null> = {
    instagram: "scrape.instagram",
    website: "scrape.website",
    manual: null,
  };
  const jobType = map[src.sourceName];
  if (!jobType) return c.json({ error: `source ${src.sourceName} has no scrape job` }, 400);

  await bus.enqueue(jobType, { sourceId: id });
  return c.json({ ok: true, enqueued: jobType });
});
