import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, ilike, sql } from "drizzle-orm";
import { db, account } from "@sgnl/db";

export const accountsRoutes = new Hono();

accountsRoutes.get("/", async (c) => {
  const q = c.req.query("q");
  const rows = q
    ? await db
        .select()
        .from(account)
        .where(ilike(account.displayName, `%${q}%`))
        .orderBy(account.displayName)
        .limit(200)
    : await db.select().from(account).orderBy(account.displayName).limit(200);
  return c.json(rows);
});

accountsRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [row] = await db.select().from(account).where(eq(account.id, id));
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

const upsertSchema = z.object({
  displayName: z.string().min(1),
  canonicalUrl: z.string().url().optional(),
  archetype: z.string().regex(/^A([1-9]|1[0-2])$/).optional(),
  followerTier: z.number().int().min(1).max(3).optional(),
  geographicMarket: z.enum(["US", "EU", "GULF", "APAC"]).default("US"),
  priceSegment: z.string().optional(),
  accountStatus: z.enum(["active", "inactive", "excluded"]).default("active"),
  handles: z.record(z.string()).default({}),
  notes: z.string().optional(),
});

accountsRoutes.post("/", zValidator("json", upsertSchema), async (c) => {
  const body = c.req.valid("json");
  const [row] = await db
    .insert(account)
    .values({ ...body, lastClassifiedAt: body.archetype ? new Date() : null })
    .returning();
  return c.json(row, 201);
});

accountsRoutes.patch("/:id", zValidator("json", upsertSchema.partial()), async (c) => {
  const id = Number(c.req.param("id"));
  const body = c.req.valid("json");
  const [row] = await db
    .update(account)
    .set({
      ...body,
      ...(body.archetype ? { lastClassifiedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(account.id, id))
    .returning();
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

accountsRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  try {
    const [row] = await db.delete(account).where(eq(account.id, id)).returning();
    if (!row) return c.json({ error: "not found" }, 404);
    return c.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "delete failed";
    if (/foreign key/i.test(message)) {
      return c.json(
        { error: "account has dependent signals or raw data; cannot delete" },
        409,
      );
    }
    return c.json({ error: message }, 500);
  }
});

accountsRoutes.post(
  "/bulk",
  zValidator("json", z.object({ accounts: z.array(upsertSchema) })),
  async (c) => {
    const { accounts } = c.req.valid("json");
    let inserted = 0;
    for (const a of accounts) {
      try {
        await db.insert(account).values(a).onConflictDoNothing({ target: account.displayName });
        inserted++;
      } catch (err) {
        // ignore individual failures, return summary
      }
    }
    return c.json({ inserted, total: accounts.length });
  },
);

accountsRoutes.get("/_/stats", async (c) => {
  const [stats] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      classified: sql<number>`COUNT(*) FILTER (WHERE ${account.archetype} IS NOT NULL)::int`,
    })
    .from(account);
  return c.json(stats ?? { total: 0, classified: 0 });
});
