"use client";

import { useMemo, useState, useTransition } from "react";
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

const ARCHETYPES = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A11", "A12"];
const GEOS = ["US", "EU", "GULF", "APAC"] as const;
const STATUSES = ["active", "inactive", "excluded"] as const;
const HANDLE_KEYS = ["website", "instagram", "linkedin", "tiktok", "pinterest"] as const;

export type Account = {
  id: number;
  displayName: string;
  canonicalUrl: string | null;
  archetype: string | null;
  followerTier: number | null;
  geographicMarket: string;
  priceSegment: string | null;
  accountStatus: string;
  handles: Record<string, string | undefined>;
  notes: string | null;
};

type FormState = {
  displayName: string;
  canonicalUrl: string;
  archetype: string;
  followerTier: string;
  geographicMarket: (typeof GEOS)[number];
  priceSegment: string;
  accountStatus: (typeof STATUSES)[number];
  handles: Record<(typeof HANDLE_KEYS)[number], string>;
  notes: string;
};

const EMPTY_FORM: FormState = {
  displayName: "",
  canonicalUrl: "",
  archetype: "",
  followerTier: "",
  geographicMarket: "US",
  priceSegment: "",
  accountStatus: "active",
  handles: { website: "", instagram: "", linkedin: "", tiktok: "", pinterest: "" },
  notes: "",
};

function toForm(a: Account): FormState {
  return {
    displayName: a.displayName,
    canonicalUrl: a.canonicalUrl ?? "",
    archetype: a.archetype ?? "",
    followerTier: a.followerTier ? String(a.followerTier) : "",
    geographicMarket: (GEOS as readonly string[]).includes(a.geographicMarket)
      ? (a.geographicMarket as (typeof GEOS)[number])
      : "US",
    priceSegment: a.priceSegment ?? "",
    accountStatus: (STATUSES as readonly string[]).includes(a.accountStatus)
      ? (a.accountStatus as (typeof STATUSES)[number])
      : "active",
    handles: {
      website: a.handles?.website ?? "",
      instagram: a.handles?.instagram ?? "",
      linkedin: a.handles?.linkedin ?? "",
      tiktok: a.handles?.tiktok ?? "",
      pinterest: a.handles?.pinterest ?? "",
    },
    notes: a.notes ?? "",
  };
}

function toPayload(f: FormState) {
  const handles: Record<string, string> = {};
  for (const k of HANDLE_KEYS) {
    const v = f.handles[k].trim();
    if (v) handles[k] = v;
  }
  return {
    displayName: f.displayName.trim(),
    canonicalUrl: f.canonicalUrl.trim() || undefined,
    archetype: f.archetype || undefined,
    followerTier: f.followerTier ? Number(f.followerTier) : undefined,
    geographicMarket: f.geographicMarket,
    priceSegment: f.priceSegment.trim() || undefined,
    accountStatus: f.accountStatus,
    handles,
    notes: f.notes.trim() || undefined,
  };
}

export function AccountsClient({
  initialAccounts,
  initialStats,
}: {
  initialAccounts: Account[];
  initialStats: { total: number; classified: number };
}) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [editing, setEditing] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const stats = useMemo(
    () => ({
      total: accounts.length,
      classified: accounts.filter((a) => a.archetype).length,
    }),
    [accounts],
  );
  const displayStats = pending ? initialStats : stats;

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleSubmit(form: FormState, id?: number) {
    setError(null);
    const payload = toPayload(form);
    const path = id ? `/accounts/${id}` : "/accounts";
    const method = id ? "PATCH" : "POST";
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? `request failed (${res.status})`);
      return;
    }
    const row = data as Account;
    setAccounts((prev) =>
      id ? prev.map((a) => (a.id === id ? row : a)) : [...prev, row].sort((x, y) =>
        x.displayName.localeCompare(y.displayName),
      ),
    );
    setEditing(null);
    setCreating(false);
    refresh();
  }

  async function handleDelete(a: Account) {
    setError(null);
    const res = await fetch(`${API_BASE}/accounts/${a.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? `delete failed (${res.status})`);
      setConfirmDelete(null);
      return;
    }
    setAccounts((prev) => prev.filter((x) => x.id !== a.id));
    setConfirmDelete(null);
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
        <h1 className="text-2xl font-semibold">Accounts</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {displayStats.classified}/{displayStats.total} classified
          </div>
          <Button size="sm" onClick={() => setCreating(true)}>
            New account
          </Button>
        </div>
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
              <TableHead>Name</TableHead>
              <TableHead>Archetype</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Geo</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Handles</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.displayName}</TableCell>
                <TableCell>{a.archetype ?? "—"}</TableCell>
                <TableCell>{a.followerTier ?? "—"}</TableCell>
                <TableCell>{a.geographicMarket}</TableCell>
                <TableCell>{a.priceSegment ?? "—"}</TableCell>
                <TableCell>{a.accountStatus}</TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {Object.entries(a.handles)
                    .filter(([, v]) => v)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(" · ")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(a)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => setConfirmDelete(a)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                  No accounts. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DesktopOnly>

      {accounts.length === 0 ? (
        <MobileCardEmpty>No accounts. Create one to get started.</MobileCardEmpty>
      ) : (
        <MobileCardList>
          {accounts.map((a) => {
            const handles = Object.entries(a.handles)
              .filter(([, v]) => v)
              .map(([k, v]) => `${k}:${v}`)
              .join(" · ");
            return (
              <MobileCard
                key={a.id}
                title={a.displayName}
                meta={
                  <span className="text-muted-foreground">{a.accountStatus}</span>
                }
                footer={
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(a)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => setConfirmDelete(a)}
                    >
                      Delete
                    </Button>
                  </div>
                }
              >
                <MobileCardField label="Archetype">{a.archetype ?? "—"}</MobileCardField>
                <MobileCardField label="Tier">{a.followerTier ?? "—"}</MobileCardField>
                <MobileCardField label="Geo">{a.geographicMarket}</MobileCardField>
                <MobileCardField label="Price">{a.priceSegment ?? "—"}</MobileCardField>
                {handles && (
                  <MobileCardField label="Handles">
                    <span className="font-mono text-muted-foreground">{handles}</span>
                  </MobileCardField>
                )}
              </MobileCard>
            );
          })}
        </MobileCardList>
      )}

      {(creating || editing) && (
        <AccountFormModal
          initial={editing ? toForm(editing) : EMPTY_FORM}
          title={editing ? `Edit ${editing.displayName}` : "New account"}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
            setError(null);
          }}
          onSubmit={(form) => handleSubmit(form, editing?.id)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={`Delete ${confirmDelete.displayName}?`}
          message="This permanently removes the account. It will fail if any signals or raw data reference it."
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </div>
  );
}

function AccountFormModal({
  initial,
  title,
  onCancel,
  onSubmit,
}: {
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

  function updateHandle(key: (typeof HANDLE_KEYS)[number], value: string) {
    setForm((f) => ({ ...f, handles: { ...f.handles, [key]: value } }));
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
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="displayName">Display name *</Label>
              <Input
                id="displayName"
                required
                value={form.displayName}
                onChange={(e) => update("displayName", e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="canonicalUrl">Canonical URL</Label>
              <Input
                id="canonicalUrl"
                type="url"
                value={form.canonicalUrl}
                onChange={(e) => update("canonicalUrl", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="archetype">Archetype</Label>
              <select
                id="archetype"
                value={form.archetype}
                onChange={(e) => update("archetype", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">—</option>
                {ARCHETYPES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="followerTier">Follower tier</Label>
              <select
                id="followerTier"
                value={form.followerTier}
                onChange={(e) => update("followerTier", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">—</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="geographicMarket">Geographic market</Label>
              <select
                id="geographicMarket"
                value={form.geographicMarket}
                onChange={(e) =>
                  update("geographicMarket", e.target.value as (typeof GEOS)[number])
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {GEOS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accountStatus">Status</Label>
              <select
                id="accountStatus"
                value={form.accountStatus}
                onChange={(e) =>
                  update("accountStatus", e.target.value as (typeof STATUSES)[number])
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="priceSegment">Price segment</Label>
              <Input
                id="priceSegment"
                placeholder="e.g. $200-$2000"
                value={form.priceSegment}
                onChange={(e) => update("priceSegment", e.target.value)}
              />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Handles</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {HANDLE_KEYS.map((k) => (
                <div key={k} className="space-y-1.5">
                  <Label htmlFor={`handle-${k}`} className="text-xs uppercase tracking-wide text-muted-foreground">
                    {k}
                  </Label>
                  <Input
                    id={`handle-${k}`}
                    value={form.handles[k]}
                    onChange={(e) => updateHandle(k, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
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

function ConfirmModal({
  title,
  message,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
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
        <h2 className="mb-2 text-lg font-semibold">{title}</h2>
        <p className="mb-5 text-sm text-muted-foreground">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await onConfirm();
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
