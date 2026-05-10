import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { sign } from "hono/jwt";
import { setCookie, deleteCookie } from "hono/cookie";
import { db, user } from "../db/index.js";
import {
  AUTH_COOKIE_NAME,
  AUTH_TTL_SECONDS,
  authCookieOptions,
  getJwtSecret,
} from "../auth/cookie.js";
import { requireAuth, getUser } from "../auth/middleware.js";

export const authRoutes = new Hono();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  const [row] = await db
    .select()
    .from(user)
    .where(eq(user.email, email.toLowerCase()))
    .limit(1);

  const fakeHash = "$2a$12$0000000000000000000000000000000000000000000000000000";
  const ok = row
    ? await bcrypt.compare(password, row.passwordHash)
    : (await bcrypt.compare(password, fakeHash), false);

  if (!row || !ok) return c.json({ error: "Invalid credentials" }, 401);

  const nowSec = Math.floor(Date.now() / 1000);
  const token = await sign(
    { sub: row.id, exp: nowSec + AUTH_TTL_SECONDS, iat: nowSec },
    getJwtSecret(),
  );

  setCookie(c, AUTH_COOKIE_NAME, token, authCookieOptions());

  return c.json({
    user: {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      role: row.role,
    },
  });
});

authRoutes.post("/trace", zValidator("json", loginSchema), async (c) => {
  console.log("[trace] start");
  const { email, password } = c.req.valid("json");
  const skipBcrypt = c.req.query("skip_bcrypt") === "1";
  const trace: Record<string, unknown> = { skipBcrypt };
  const raceTimeout = (ms: number, label: string) =>
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout ${ms}ms`)), ms),
    );

  console.log("[trace] before db");
  const t0 = Date.now();
  let row: { passwordHash: string } | undefined;
  try {
    const result = (await Promise.race([
      db
        .select()
        .from(user)
        .where(eq(user.email, email.toLowerCase()))
        .limit(1),
      raceTimeout(8000, "db"),
    ])) as Array<{ passwordHash: string }>;
    row = result[0];
    trace.dbMs = Date.now() - t0;
    trace.userFound = !!row;
    console.log(`[trace] after db ${trace.dbMs}ms found=${trace.userFound}`);
  } catch (e) {
    trace.dbError = e instanceof Error ? e.message : String(e);
    trace.dbMs = Date.now() - t0;
    console.log(`[trace] db FAILED: ${trace.dbError}`);
    return c.json({ stage: "db", trace }, 503);
  }

  if (!row) return c.json({ stage: "no-user", trace });
  if (skipBcrypt) {
    console.log("[trace] skipping bcrypt");
    return c.json({ stage: "skipped-bcrypt", trace });
  }

  console.log("[trace] before bcrypt");
  const t1 = Date.now();
  try {
    const ok = await Promise.race([
      bcrypt.compare(password, row.passwordHash),
      raceTimeout(8000, "bcrypt"),
    ]);
    trace.bcryptMs = Date.now() - t1;
    trace.bcryptOk = ok;
    console.log(`[trace] after bcrypt ${trace.bcryptMs}ms ok=${ok}`);
  } catch (e) {
    trace.bcryptError = e instanceof Error ? e.message : String(e);
    trace.bcryptMs = Date.now() - t1;
    console.log(`[trace] bcrypt FAILED: ${trace.bcryptError}`);
    return c.json({ stage: "bcrypt", trace }, 503);
  }

  trace.totalMs = Date.now() - t0;
  return c.json({ stage: "complete", trace });
});

authRoutes.get("/me", requireAuth, (c) => {
  return c.json({ user: getUser(c) });
});

authRoutes.post("/logout", (c) => {
  deleteCookie(c, AUTH_COOKIE_NAME, { path: "/" });
  return c.body(null, 204);
});
