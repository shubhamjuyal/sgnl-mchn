import { Hono } from "hono";
import { db, programCatalog } from "@sgnl/db";

export const programsRoutes = new Hono();

programsRoutes.get("/", async (c) => {
  const rows = await db.select().from(programCatalog).orderBy(programCatalog.programId);
  return c.json(rows);
});
