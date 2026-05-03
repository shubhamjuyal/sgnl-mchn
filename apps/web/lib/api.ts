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

async function call<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  if (opts.body !== undefined) headers.set("content-type", "application/json");
  const res = await fetch(`${resolveApiBase()}${path}`, {
    ...opts,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T,>(p: string) => call<T>(p),
  post: <T,>(p: string, body: unknown) => call<T>(p, { method: "POST", body }),
  patch: <T,>(p: string, body: unknown) => call<T>(p, { method: "PATCH", body }),
  delete: <T,>(p: string) => call<T>(p, { method: "DELETE" }),
};
