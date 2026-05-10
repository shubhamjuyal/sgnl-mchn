import type { CookieOptions } from "hono/utils/cookie";

export const AUTH_COOKIE_NAME = "auth_token";

export const AUTH_TTL_SECONDS = 7 * 24 * 60 * 60;

export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: AUTH_TTL_SECONDS,
  };
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET must be set (>=16 chars)");
  }
  return secret;
}
