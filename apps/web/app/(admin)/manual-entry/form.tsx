"use client";

import { useState } from "react";

type Account = { id: number; displayName: string; archetype: string | null };
type SignalDef = { code: string; label: string; category: string };

export function ManualEntryForm({
  accounts,
  dictionary,
}: {
  accounts: Account[];
  dictionary: SignalDef[];
}) {
  const [accountId, setAccountId] = useState<number | "">("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [hints, setHints] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${apiBase}/ingest/manual`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId,
          content,
          url: url || undefined,
          signalCodeHints: hints.length ? hints : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "request failed");
      setResult(`Logged. raw_data id ${data.rawDataId}. Detection job enqueued.`);
      setContent("");
      setUrl("");
      setHints([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Account</span>
        <select
          required
          value={accountId}
          onChange={(e) => setAccountId(Number(e.target.value))}
          className="mt-1 block w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5"
        >
          <option value="">Select an account…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id} disabled={!a.archetype}>
              {a.displayName} {a.archetype ? `[${a.archetype}]` : "(unclassified)"}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Content (post caption / comment / description)</span>
        <textarea
          required
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mt-1 block w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5 font-mono text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Source URL (optional)</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="mt-1 block w-full rounded border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5"
        />
      </label>

      <fieldset>
        <legend className="text-sm font-medium">Signal code hints (optional)</legend>
        <div className="mt-1 grid grid-cols-4 gap-1 text-xs">
          {dictionary.map((d) => (
            <label key={d.code} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={hints.includes(d.code)}
                onChange={(e) =>
                  setHints((h) =>
                    e.target.checked ? [...h, d.code] : h.filter((c) => c !== d.code),
                  )
                }
              />
              <span className="font-mono">{d.code}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-1.5 rounded bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Log signal"}
      </button>

      {result && <p className="text-sm text-emerald-600">{result}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
