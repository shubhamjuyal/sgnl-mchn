import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, signalDictionary, configVersionLog } from "@sgnl/db";

export const dictionaryRoutes = new Hono();

dictionaryRoutes.get("/", async (c) => {
  const rows = await db.select().from(signalDictionary).orderBy(signalDictionary.code);
  return c.json(rows);
});

dictionaryRoutes.get("/:code", async (c) => {
  const code = c.req.param("code");
  const [row] = await db.select().from(signalDictionary).where(eq(signalDictionary.code, code));
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

const updateSchema = z
  .object({
    defaultWeight: z.number().int().optional(),
    weightMin: z.number().int().optional(),
    weightMax: z.number().int().optional(),
    examplePhrases: z.array(z.string()).optional(),
    maxOccurrences: z.number().int().nullable().optional(),
    occurrenceWindowDays: z.number().int().nullable().optional(),
    status: z.string().optional(),
    rationale: z.string().min(1), // required for audit
  })
  .strict();

dictionaryRoutes.patch("/:code", zValidator("json", updateSchema), async (c) => {
  const code = c.req.param("code");
  const { rationale, ...patch } = c.req.valid("json");
  const approvedBy = c.req.header("x-user-email") ?? "system";

  const [before] = await db.select().from(signalDictionary).where(eq(signalDictionary.code, code));
  if (!before) return c.json({ error: "not found" }, 404);

  const [after] = await db
    .update(signalDictionary)
    .set({ ...patch, version: before.version + 1, updatedAt: new Date() })
    .where(eq(signalDictionary.code, code))
    .returning();

  // Audit each changed field
  for (const [field, newValue] of Object.entries(patch)) {
    const oldValue = (before as Record<string, unknown>)[field];
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
    await db.insert(configVersionLog).values({
      tableName: "signal_dictionary",
      rowKey: code,
      fieldChanged: field,
      oldValue: oldValue as never,
      newValue: newValue as never,
      approvedBy,
      rationale,
    });
  }

  return c.json(after);
});
