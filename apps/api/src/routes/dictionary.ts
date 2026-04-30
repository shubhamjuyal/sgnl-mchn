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

const decayRuleSchema = z.object({
  schedule: z
    .array(z.object({ upToDays: z.number().int().positive(), multiplier: z.number().min(0) }))
    .min(1),
});

const categoryEnum = z.enum(["structural", "assortment", "demand", "vendor_openness"]);
const typeEnum = z.enum(["event", "trend"]);

const createSchema = z
  .object({
    code: z.string().min(1).regex(/^[A-Z][A-Z0-9]*$/, "code must be uppercase alphanumeric"),
    signalName: z.string().min(1),
    label: z.string().min(1),
    category: categoryEnum,
    type: typeEnum,
    defaultWeight: z.number().int(),
    weightMin: z.number().int(),
    weightMax: z.number().int(),
    examplePhrases: z.array(z.string()).default([]),
    guardrailNotes: z.string().nullable().optional(),
    decayRule: decayRuleSchema,
    programRelevance: z.string().nullable().optional(),
    maxOccurrences: z.number().int().nullable().optional(),
    occurrenceWindowDays: z.number().int().nullable().optional(),
    status: z.string().default("active"),
    rationale: z.string().min(1),
  })
  .strict();

const updateSchema = z
  .object({
    signalName: z.string().min(1).optional(),
    label: z.string().min(1).optional(),
    category: categoryEnum.optional(),
    type: typeEnum.optional(),
    defaultWeight: z.number().int().optional(),
    weightMin: z.number().int().optional(),
    weightMax: z.number().int().optional(),
    examplePhrases: z.array(z.string()).optional(),
    guardrailNotes: z.string().nullable().optional(),
    decayRule: decayRuleSchema.optional(),
    programRelevance: z.string().nullable().optional(),
    maxOccurrences: z.number().int().nullable().optional(),
    occurrenceWindowDays: z.number().int().nullable().optional(),
    status: z.string().optional(),
    rationale: z.string().min(1),
  })
  .strict();

const deleteSchema = z.object({ rationale: z.string().min(1) }).strict();

dictionaryRoutes.post("/", zValidator("json", createSchema), async (c) => {
  const { rationale, ...row } = c.req.valid("json");
  const approvedBy = c.req.header("x-user-email") ?? "system";

  const [existing] = await db
    .select()
    .from(signalDictionary)
    .where(eq(signalDictionary.code, row.code));
  if (existing) return c.json({ error: "code already exists" }, 409);

  const [inserted] = await db.insert(signalDictionary).values(row).returning();
  await db.insert(configVersionLog).values({
    tableName: "signal_dictionary",
    rowKey: row.code,
    fieldChanged: "*created*",
    oldValue: null,
    newValue: inserted as never,
    approvedBy,
    rationale,
  });
  return c.json(inserted, 201);
});

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

dictionaryRoutes.delete("/:code", zValidator("json", deleteSchema), async (c) => {
  const code = c.req.param("code");
  const { rationale } = c.req.valid("json");
  const approvedBy = c.req.header("x-user-email") ?? "system";

  try {
    const [row] = await db
      .delete(signalDictionary)
      .where(eq(signalDictionary.code, code))
      .returning();
    if (!row) return c.json({ error: "not found" }, 404);
    await db.insert(configVersionLog).values({
      tableName: "signal_dictionary",
      rowKey: code,
      fieldChanged: "*deleted*",
      oldValue: row as never,
      newValue: null,
      approvedBy,
      rationale,
    });
    return c.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "delete failed";
    if (/foreign key/i.test(message)) {
      return c.json(
        { error: "signal entries reference this code; cannot delete" },
        409,
      );
    }
    return c.json({ error: message }, 500);
  }
});
