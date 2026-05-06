import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { ingestRoutes } from "./routes/ingest.js";
import { sourcesRoutes } from "./routes/sources.js";
import { accountsRoutes } from "./routes/accounts.js";
import { dictionaryRoutes } from "./routes/dictionary.js";
import { signalsRoutes } from "./routes/signals.js";
import { scoresRoutes } from "./routes/scores.js";
import { routingRoutes } from "./routes/routing.js";
import { guardrailsRoutes } from "./routes/guardrails.js";
import { programsRoutes } from "./routes/programs.js";
import { authRoutes } from "./routes/auth.js";
import { requireAuth } from "./auth/middleware.js";

export const app = new Hono();
app.use("*", logger());

const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
app.use(
  "*",
  cors({
    origin: webOrigin,
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ ok: true }));
app.route("/auth", authRoutes);

const protectedApi = new Hono();
protectedApi.use("*", requireAuth);
protectedApi.route("/ingest", ingestRoutes);
protectedApi.route("/sources", sourcesRoutes);
protectedApi.route("/accounts", accountsRoutes);
protectedApi.route("/dictionary", dictionaryRoutes);
protectedApi.route("/signals", signalsRoutes);
protectedApi.route("/scores", scoresRoutes);
protectedApi.route("/routing", routingRoutes);
protectedApi.route("/guardrails", guardrailsRoutes);
protectedApi.route("/programs", programsRoutes);

app.route("/", protectedApi);
