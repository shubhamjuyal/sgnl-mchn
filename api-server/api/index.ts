import type { IncomingMessage, ServerResponse } from "node:http";
import { app } from "../src/app.js";

export const config = { runtime: "nodejs" };

type VercelReq = IncomingMessage & { body?: unknown };

export default async function handler(req: VercelReq, res: ServerResponse) {
  try {
    const protocol = (req.headers["x-forwarded-proto"] as string) || "https";
    const host = req.headers.host;
    const url = `${protocol}://${host}${req.url}`;
    const method = req.method || "GET";

    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (v === undefined) continue;
      if (k === "content-length") continue;
      headers.set(k, Array.isArray(v) ? v.join(",") : v);
    }

    let body: string | null = null;
    if (method !== "GET" && method !== "HEAD") {
      if (req.body !== undefined && req.body !== null) {
        if (typeof req.body === "string") {
          body = req.body;
        } else if (Buffer.isBuffer(req.body)) {
          body = req.body.toString("utf-8");
        } else {
          body = JSON.stringify(req.body);
        }
      }
    }

    const request = new Request(url, { method, headers, body });
    const response = await app.fetch(request);

    res.statusCode = response.status;

    const setCookies =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [];
    if (setCookies.length > 0) {
      res.setHeader("set-cookie", setCookies);
    }
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") return;
      res.setHeader(key, value);
    });

    const responseText = await response.text();
    res.end(responseText);
  } catch (e) {
    console.error("[api] handler error:", e);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        error: "internal server error",
        details: e instanceof Error ? e.message : String(e),
      }),
    );
  }
}
