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

authRoutes.get("/me", requireAuth, (c) => {
  return c.json({ user: getUser(c) });
});

authRoutes.post("/logout", (c) => {
  deleteCookie(c, AUTH_COOKIE_NAME, { path: "/" });
  return c.body(null, 204);
});
