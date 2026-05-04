"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DesktopOnly,
  MobileCard,
  MobileCardEmpty,
  MobileCardField,
  MobileCardList,
} from "@/components/ui/mobile-card";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

const CATEGORIES = ["structural", "assortment", "demand", "vendor_openness"] as const;
const TYPES = ["event", "trend"] as const;

type Category = (typeof CATEGORIES)[number];
type SignalType = (typeof TYPES)[number];

type DecaySchedule = { upToDays: number; multiplier: number }[];

export type Entry = {
  code: string;
  signalName: string;
  label: string;
  category: Category;
  type: SignalType;
  defaultWeight: number;
  weightMin: number;
  weightMax: number;
  examplePhrases: string[];
  guardrailNotes: string | null;
  decayRule: { schedule: DecaySchedule };
  programRelevance: string | null;
  maxOccurrences: number | null;
  occurrenceWindowDays: number | null;
  status: string;
  version: number;
};

type FormState = {
  code: string;
  signalName: string;
  label: string;
  category: Category;
  type: SignalType;
  defaultWeight: string;
  weightMin: string;
  weightMax: string;
  examplePhrases: string; // newline-separated
  guardrailNotes: string;
  decayRuleJson: string;
  programRelevance: string;
  maxOccurrences: string;
  occurrenceWindowDays: string;
  status: string;
  rationale: string;
};

const DEFAULT_DECAY = {
  schedule: [
    { upToDays: 30, multiplier: 1.0 },
    { upToDays: 90, multiplier: 0.5 },
    { upToDays: 180, multiplier: 0.0 },
  ],
};

const EMPTY_FORM: FormState = {
  code: "",
  signalName: "",
  label: "",
  category: "structural",
  type: "event",
  defaultWeight: "10",
  weightMin: "5",
  weightMax: "15",
  examplePhrases: "",
  guardrailNotes: "",
  decayRuleJson: JSON.stringify(DEFAULT_DECAY, null, 2),
  programRelevance: "",
  maxOccurrences: "",
  occurrenceWindowDays: "",
  status: "active",
  rationale: "",
};

function toForm(e: Entry): FormState {
  return {
    code: e.code,
    signalName: e.signalName,
    label: e.label,
    category: e.category,
    type: e.type,
    defaultWeight: String(e.defaultWeight),
    weightMin: String(e.weightMin),
    weightMax: String(e.weightMax),
    examplePhrases: e.examplePhrases.join("\n"),
    guardrailNotes: e.guardrailNotes ?? "",
    decayRuleJson: JSON.stringify(e.decayRule, null, 2),
    programRelevance: e.programRelevance ?? "",
    maxOccurrences: e.maxOccurrences != null ? String(e.maxOccurrences) : "",
    occurrenceWindowDays:
      e.occurrenceWindowDays != null ? String(e.occurrenceWindowDays) : "",
    status: e.status,
    rationale: "",
  };
}

function toCreatePayload(f: FormState) {
  return {
    code: f.code.trim(),
    signalName: f.signalName.trim(),
    label: f.label.trim(),
    category: f.category,
    type: f.type,
    defaultWeight: Number(f.defaultWeight),
    weightMin: Number(f.weightMin),
    weightMax: Number(f.weightMax),
    examplePhrases: f.examplePhrases
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    guardrailNotes: f.guardrailNotes.trim() || null,
    decayRule: JSON.parse(f.decayRuleJson),
    programRelevance: f.programRelevance.trim() || null,
    maxOccurrences: f.maxOccurrences === "" ? null : Number(f.maxOccurrences),
    occurrenceWindowDays:
      f.occurrenceWindowDays === "" ? null : Number(f.occurrenceWindowDays),
    status: f.status,
    rationale: f.rationale.trim(),
  };
}

function toUpdatePayload(f: FormState) {
  // PATCH doesn't accept code (it's the URL param)
  const { code: _omit, ...rest } = toCreatePayload(f);
  void _omit;
  return rest;
}

export function DictionaryClient({ initial }: { initial: Entry[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Entry[]>(initial);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Entry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleSubmit(form: FormState, code?: string) {
    setError(null);
    let body: ReturnType<typeof toCreatePayload>;
    try {
      body = code ? (toUpdatePayload(form) as never) : toCreatePayload(form);
    } catch (err) {
      setError(`invalid input: ${err instanceof Error ? err.message : "parse error"}`);
      return;
    }
    const path = code ? `/dictionary/${code}` : "/dictionary";
    const method = code ? "PATCH" : "POST";
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? `request failed (${res.status})`);
      return;
    }
    const row = data as Entry;
    setRows((prev) =>
      code
        ? prev.map((r) => (r.code === code ? row : r))
        : [...prev, row].sort((a, b) => a.code.localeCompare(b.code)),
    );
    setEditing(null);
    setCreating(false);
    refresh();
  }

  async function handleDelete(entry: Entry, rationale: string) {
    setError(null);
    const res = await fetch(`${API_BASE}/dictionary/${entry.code}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rationale }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? `delete failed (${res.status})`);
      setConfirmDelete(null);
      return;
    }
    setRows((prev) => prev.filter((r) => r.code !== entry.code));
    setConfirmDelete(null);
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
        <h1 className="text-2xl font-semibold">Signal dictionary</h1>
        <Button size="sm" onClick={() => setCreating(true)}>
          New entry
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <DesktopOnly>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead>Cap</TableHead>
              <TableHead>Example phrases</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.code} className="align-top">
                <TableCell className="font-mono">{r.code}</TableCell>
                <TableCell className="font-medium">{r.label}</TableCell>
                <TableCell className="text-xs">{r.category}</TableCell>
                <TableCell className="text-xs">{r.type}</TableCell>
                <TableCell>
                  {r.defaultWeight}
                  <span className="text-xs text-muted-foreground ml-1">
                    ({r.weightMin}–{r.weightMax})
                  </span>
                </TableCell>
                <TableCell className="text-xs">
                  {r.maxOccurrences != null
                    ? `${r.maxOccurrences}/${r.occurrenceWindowDays ?? "—"}d`
                    : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.examplePhrases.slice(0, 4).join(" · ")}
                  {r.examplePhrases.length > 4 && ` …+${r.examplePhrases.length - 4}`}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => setConfirmDelete(r)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                  No entries.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DesktopOnly>

      {rows.length === 0 ? (
        <MobileCardEmpty>No entries.</MobileCardEmpty>
      ) : (
        <MobileCardList>
          {rows.map((r) => {
            const phrases =
              r.examplePhrases.slice(0, 4).join(" · ") +
              (r.examplePhrases.length > 4 ? ` …+${r.examplePhrases.length - 4}` : "");
            return (
              <MobileCard
                key={r.code}
                title={r.label}
                meta={<span className="font-mono text-muted-foreground">{r.code}</span>}
                footer={
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => setConfirmDelete(r)}
                    >
                      Delete
                    </Button>
                  </div>
                }
              >
                <MobileCardField label="Category">{r.category}</MobileCardField>
                <MobileCardField label="Type">{r.type}</MobileCardField>
                <MobileCardField label="Weight">
                  {r.defaultWeight}
                  <span className="text-muted-foreground ml-1">
                    ({r.weightMin}–{r.weightMax})
                  </span>
                </MobileCardField>
                <MobileCardField label="Cap">
                  {r.maxOccurrences != null
                    ? `${r.maxOccurrences}/${r.occurrenceWindowDays ?? "—"}d`
                    : "—"}
                </MobileCardField>
                {phrases && (
                  <MobileCardField label="Examples">
                    <span className="text-muted-foreground">{phrases}</span>
                  </MobileCardField>
                )}
              </MobileCard>
            );
          })}
        </MobileCardList>
      )}

      {(creating || editing) && (
        <EntryFormModal
          mode={editing ? "edit" : "create"}
          initial={editing ? toForm(editing) : EMPTY_FORM}
          title={editing ? `Edit ${editing.code}` : "New dictionary entry"}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
            setError(null);
          }}
          onSubmit={(form) => handleSubmit(form, editing?.code)}
        />
      )}

      {confirmDelete && (
        <DeleteModal
          entry={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={(rationale) => handleDelete(confirmDelete, rationale)}
        />
      )}
    </div>
  );
}

function EntryFormModal({
  mode,
  initial,
  title,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial: FormState;
  title: string;
  onCancel: () => void;
  onSubmit: (form: FormState) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 md:p-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-2xl rounded-lg border border-border bg-card p-4 md:p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                required
                disabled={mode === "edit"}
                value={form.code}
                onChange={(e) => update("code", e.target.value.toUpperCase())}
                className="font-mono"
                placeholder="S1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Input
                id="status"
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="signalName">Signal name *</Label>
              <Input
                id="signalName"
                required
                value={form.signalName}
                onChange={(e) => update("signalName", e.target.value)}
                placeholder="store_expansion_announced"
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="label">Label *</Label>
              <Input
                id="label"
                required
                value={form.label}
                onChange={(e) => update("label", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => update("category", e.target.value as Category)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type">Type *</Label>
              <select
                id="type"
                value={form.type}
                onChange={(e) => update("type", e.target.value as SignalType)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="defaultWeight">Default weight *</Label>
              <Input
                id="defaultWeight"
                type="number"
                required
                value={form.defaultWeight}
                onChange={(e) => update("defaultWeight", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weightMin">Weight min *</Label>
              <Input
                id="weightMin"
                type="number"
                required
                value={form.weightMin}
                onChange={(e) => update("weightMin", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weightMax">Weight max *</Label>
              <Input
                id="weightMax"
                type="number"
                required
                value={form.weightMax}
                onChange={(e) => update("weightMax", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxOccurrences">Max occurrences</Label>
              <Input
                id="maxOccurrences"
                type="number"
                value={form.maxOccurrences}
                onChange={(e) => update("maxOccurrences", e.target.value)}
                placeholder="leave empty = unlimited"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="occurrenceWindowDays">Occurrence window (days)</Label>
              <Input
                id="occurrenceWindowDays"
                type="number"
                value={form.occurrenceWindowDays}
                onChange={(e) => update("occurrenceWindowDays", e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="examplePhrases">Example phrases (one per line)</Label>
              <Textarea
                id="examplePhrases"
                rows={4}
                value={form.examplePhrases}
                onChange={(e) => update("examplePhrases", e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="decayRuleJson">Decay rule (JSON)</Label>
              <Textarea
                id="decayRuleJson"
                rows={6}
                value={form.decayRuleJson}
                onChange={(e) => update("decayRuleJson", e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Shape: {`{ "schedule": [{ "upToDays": N, "multiplier": M }, ...] }`}
              </p>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="guardrailNotes">Guardrail notes</Label>
              <Textarea
                id="guardrailNotes"
                rows={2}
                value={form.guardrailNotes}
                onChange={(e) => update("guardrailNotes", e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="programRelevance">Program relevance</Label>
              <Input
                id="programRelevance"
                value={form.programRelevance}
                onChange={(e) => update("programRelevance", e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="rationale">Change rationale *</Label>
              <Textarea
                id="rationale"
                required
                rows={2}
                value={form.rationale}
                onChange={(e) => update("rationale", e.target.value)}
                placeholder="Why is this change being made? (audited)"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteModal({
  entry,
  onCancel,
  onConfirm,
}: {
  entry: Entry;
  onCancel: () => void;
  onConfirm: (rationale: string) => Promise<void>;
}) {
  const [rationale, setRationale] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 md:p-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card p-4 md:p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-semibold">Delete {entry.code}?</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          This permanently removes the dictionary entry. It will fail if any signals reference this code.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="del-rationale">Rationale *</Label>
          <Textarea
            id="del-rationale"
            required
            rows={2}
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending || !rationale.trim()}
            onClick={async () => {
              setPending(true);
              try {
                await onConfirm(rationale.trim());
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
