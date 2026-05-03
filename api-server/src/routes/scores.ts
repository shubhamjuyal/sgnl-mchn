import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { db, accountScore, account } from "../db/index.js";

export const scoresRoutes = new Hono();

scoresRoutes.get("/", async (c) => {
  const rows = await db
    .select({
      accountId: accountScore.accountId,
      displayName: account.displayName,
      archetype: account.archetype,
      signalScore: accountScore.signalScore,
      highestTier: accountScore.highestTier,
      topSignals: accountScore.topSignals,
      signalsCounted: accountScore.signalsCounted,
      lastSignalAt: accountScore.lastSignalAt,
      isFresh: accountScore.isFresh,
      lastUpdatedAt: accountScore.lastUpdatedAt,
    })
    .from(accountScore)
    .leftJoin(account, eq(account.id, accountScore.accountId))
    .orderBy(desc(accountScore.signalScore))
    .limit(200);
  return c.json(rows);
});

scoresRoutes.get("/:accountId", async (c) => {
  const id = Number(c.req.param("accountId"));
  const [row] = await db.select().from(accountScore).where(eq(accountScore.accountId, id));
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(row);
});
