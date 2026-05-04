"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
      <div className="space-y-1.5">
        <Label htmlFor="account">Account</Label>
        <select
          id="account"
          required
          value={accountId}
          onChange={(e) => setAccountId(Number(e.target.value))}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Select an account…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id} disabled={!a.archetype}>
              {a.displayName} {a.archetype ? `[${a.archetype}]` : "(unclassified)"}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="content">
          Content (post caption / comment / description)
        </Label>
        <Textarea
          id="content"
          required
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="font-mono"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="url">Source URL (optional)</Label>
        <Input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Signal code hints (optional)</legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
          {dictionary.map((d) => {
            const id = `hint-${d.code}`;
            return (
              <div key={d.code} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={hints.includes(d.code)}
                  onCheckedChange={(checked) =>
                    setHints((h) =>
                      checked === true
                        ? [...h, d.code]
                        : h.filter((c) => c !== d.code),
                    )
                  }
                />
                <Label htmlFor={id} className="font-mono cursor-pointer">
                  {d.code}
                </Label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Log signal"}
      </Button>

      {result && <p className="text-sm text-emerald-400">{result}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
