import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, programCatalog } from "../db/index.js";

export const programsRoutes = new Hono();

const statusEnum = z.enum(["PHASE_1_LIVE", "DEVELOPMENT", "DEPRECATED"]);

const upsertSchema = z.object({
  programId: z.string().min(1),
  name: z.string().min(1),
  status: statusEnum,
  targetArchetypes: z.array(z.string()).default([]),
  triggerSignals: z.array(z.string()).default([]),
  priceBand: z.string().min(1),
  moq: z.string().min(1),
  framing: z.string().min(1),
  riskStructure: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

programsRoutes.get("/", async (c) => {
  const rows = await db.select().from(programCatalog).orderBy(programCatalog.programId);
  return c.json(rows);
});

programsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [row] = await db
    .select()
    .from(programCatalog)
    .where(eq(programCatalog.programId, id));
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});

programsRoutes.post("/", zValidator("json", upsertSchema), async (c) => {
  const body = c.req.valid("json");
  const [existing] = await db
    .select()
    .from(programCatalog)
    .where(eq(programCatalog.programId, body.programId));
  if (existing) return c.json({ error: "programId already exists" }, 409);
  const [row] = await db.insert(programCatalog).values(body).returning();
  return c.json(row, 201);
});

programsRoutes.patch(
  "/:id",
  zValidator("json", upsertSchema.omit({ programId: true }).partial()),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const [row] = await db
      .update(programCatalog)
      .set(body)
      .where(eq(programCatalog.programId, id))
      .returning();
    if (!row) return c.json({ error: "not found" }, 404);
    return c.json(row);
  },
);

programsRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const [row] = await db
      .delete(programCatalog)
      .where(eq(programCatalog.programId, id))
      .returning();
    if (!row) return c.json({ error: "not found" }, 404);
    return c.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "delete failed";
    if (/foreign key/i.test(message)) {
      return c.json(
        { error: "program is referenced by archetype mappings or outreach drafts; cannot delete" },
        409,
      );
    }
    return c.json({ error: message }, 500);
  }
});
