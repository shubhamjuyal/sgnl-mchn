import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { log } from "./lib/log.js";
import { ingestRoutes } from "./routes/ingest.js";
import { sourcesRoutes } from "./routes/sources.js";
import { accountsRoutes } from "./routes/accounts.js";
import { dictionaryRoutes } from "./routes/dictionary.js";
import { signalsRoutes } from "./routes/signals.js";
import { scoresRoutes } from "./routes/scores.js";
import { routingRoutes } from "./routes/routing.js";
import { guardrailsRoutes } from "./routes/guardrails.js";
import { programsRoutes } from "./routes/programs.js";

const app = new Hono();
app.use("*", logger());
app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true }));

app.route("/ingest", ingestRoutes);
app.route("/sources", sourcesRoutes);
app.route("/accounts", accountsRoutes);
app.route("/dictionary", dictionaryRoutes);
app.route("/signals", signalsRoutes);
app.route("/scores", scoresRoutes);
app.route("/routing", routingRoutes);
app.route("/guardrails", guardrailsRoutes);
app.route("/programs", programsRoutes);

const port = Number(process.env.API_PORT ?? 3001);
log.info({ port }, "api listening");
serve({ fetch: app.fetch, port });
