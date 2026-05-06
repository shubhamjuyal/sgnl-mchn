import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { eq } from "drizzle-orm";
import { db, user } from "../db/index.js";
import { AUTH_COOKIE_NAME, getJwtSecret } from "./cookie.js";

export type AuthUser = {
  id: number;
  email: string;
  displayName: string;
  role: string;
};

type AuthVariables = { user: AuthUser };

export const requireAuth: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  const token = getCookie(c, AUTH_COOKIE_NAME);
  if (!token) return c.json({ error: "unauthenticated" }, 401);

  let payload: { sub?: number | string };
  try {
    payload = (await verify(token, getJwtSecret(), "HS256")) as { sub?: number | string };
  } catch {
    return c.json({ error: "unauthenticated" }, 401);
  }

  const userId = typeof payload.sub === "string" ? Number(payload.sub) : payload.sub;
  if (!userId || Number.isNaN(userId)) return c.json({ error: "unauthenticated" }, 401);

  const [row] = await db
    .select({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!row) return c.json({ error: "unauthenticated" }, 401);

  c.set("user", row);
  await next();
};

export function getUser(c: Context<{ Variables: AuthVariables }>): AuthUser {
  return c.get("user");
}
