import "dotenv/config";
import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { log } from "./lib/log.js";

const port = Number(process.env.API_PORT ?? 3001);
log.info({ port }, "api listening");
serve({ fetch: app.fetch, port });
