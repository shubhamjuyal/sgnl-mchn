function resolveApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;
  if (fromEnv && fromEnv.length > 0) return fromEnv.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL must be set in production. Configure it in Vercel project environment variables.",
    );
  }
  return "http://localhost:3001";
}

type FetchOptions = Omit<RequestInit, "body"> & { body?: unknown };

async function getServerCookieHeader(): Promise<string | null> {
  if (typeof window !== "undefined") return null;
  try {
    const mod = await import("next/headers");
    const store = await mod.cookies();
    return store.toString() || null;
  } catch {
    return null;
  }
}

async function call<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  if (opts.body !== undefined) headers.set("content-type", "application/json");

  const init: RequestInit = {
    ...opts,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  };

  if (typeof window === "undefined") {
    const cookieHeader = await getServerCookieHeader();
    if (cookieHeader) headers.set("cookie", cookieHeader);
  } else {
    init.credentials = "include";
  }

  const res = await fetch(`${resolveApiBase()}${path}`, init);

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      const here = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?from=${here}`;
      throw new Error("Unauthenticated");
    }
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T,>(p: string) => call<T>(p),
  post: <T,>(p: string, body?: unknown) => call<T>(p, { method: "POST", body }),
  patch: <T,>(p: string, body: unknown) => call<T>(p, { method: "PATCH", body }),
  delete: <T,>(p: string) => call<T>(p, { method: "DELETE" }),
};
