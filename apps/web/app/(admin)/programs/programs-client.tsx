"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
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

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

const STATUSES = ["PHASE_1_LIVE", "DEVELOPMENT", "DEPRECATED"] as const;
type Status = (typeof STATUSES)[number];

export type Program = {
  programId: string;
  name: string;
  status: Status;
  targetArchetypes: string[];
  triggerSignals: string[];
  priceBand: string;
  moq: string;
  framing: string;
  riskStructure: string | null;
  notes: string | null;
};

type FormState = {
  programId: string;
  name: string;
  status: Status;
  targetArchetypes: string; // comma-separated
  triggerSignals: string; // comma-separated
  priceBand: string;
  moq: string;
  framing: string;
  riskStructure: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  programId: "",
  name: "",
  status: "DEVELOPMENT",
  targetArchetypes: "",
  triggerSignals: "",
  priceBand: "",
  moq: "",
  framing: "",
  riskStructure: "",
  notes: "",
};

function toForm(p: Program): FormState {
  return {
    programId: p.programId,
    name: p.name,
    status: p.status,
    targetArchetypes: p.targetArchetypes.join(", "),
    triggerSignals: p.triggerSignals.join(", "),
    priceBand: p.priceBand,
    moq: p.moq,
    framing: p.framing,
    riskStructure: p.riskStructure ?? "",
    notes: p.notes ?? "",
  };
}

function splitList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function toCreatePayload(f: FormState) {
  return {
    programId: f.programId.trim(),
    name: f.name.trim(),
    status: f.status,
    targetArchetypes: splitList(f.targetArchetypes),
    triggerSignals: splitList(f.triggerSignals),
    priceBand: f.priceBand.trim(),
    moq: f.moq.trim(),
    framing: f.framing.trim(),
    riskStructure: f.riskStructure.trim() || null,
    notes: f.notes.trim() || null,
  };
}

function toUpdatePayload(f: FormState) {
  const { programId: _omit, ...rest } = toCreatePayload(f);
  void _omit;
  return rest;
}

export function ProgramsClient({ initial }: { initial: Program[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Program[]>(initial);
  const [editing, setEditing] = useState<Program | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Program | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleSubmit(form: FormState, programId?: string) {
    setError(null);
    const body = programId ? toUpdatePayload(form) : toCreatePayload(form);
    const path = programId ? `/programs/${programId}` : "/programs";
    const method = programId ? "PATCH" : "POST";
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
    const row = data as Program;
    setRows((prev) =>
      programId
        ? prev.map((p) => (p.programId === programId ? row : p))
        : [...prev, row].sort((a, b) => a.programId.localeCompare(b.programId)),
    );
    setEditing(null);
    setCreating(false);
    refresh();
  }

  async function handleDelete(p: Program) {
    setError(null);
    const res = await fetch(`${API_BASE}/programs/${p.programId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? `delete failed (${res.status})`);
      setConfirmDelete(null);
      return;
    }
    setRows((prev) => prev.filter((x) => x.programId !== p.programId));
    setConfirmDelete(null);
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
        <h1 className="text-2xl font-semibold">Program catalog</h1>
        <Button size="sm" onClick={() => setCreating(true)}>
          New program
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Archetypes</TableHead>
            <TableHead>Trigger signals</TableHead>
            <TableHead>Price band</TableHead>
            <TableHead>MOQ</TableHead>
            <TableHead className="w-32 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.programId}>
              <TableCell className="font-mono">{p.programId}</TableCell>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell>
                <Badge variant={p.status === "PHASE_1_LIVE" ? "success" : "muted"}>
                  {p.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{p.targetArchetypes.join(", ")}</TableCell>
              <TableCell className="text-xs">{p.triggerSignals.join(", ")}</TableCell>
              <TableCell className="text-xs">{p.priceBand}</TableCell>
              <TableCell className="text-xs">{p.moq}</TableCell>
              <TableCell className="text-right">
                <div className="inline-flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => setConfirmDelete(p)}
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
                No programs.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {(creating || editing) && (
        <ProgramFormModal
          mode={editing ? "edit" : "create"}
          initial={editing ? toForm(editing) : EMPTY_FORM}
          title={editing ? `Edit ${editing.programId}` : "New program"}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
            setError(null);
          }}
          onSubmit={(form) => handleSubmit(form, editing?.programId)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title={`Delete ${confirmDelete.programId}?`}
          message="This permanently removes the program. It will fail if any archetype mappings or outreach drafts reference it."
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </div>
  );
}

function ProgramFormModal({
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
              <Label htmlFor="programId">Program ID *</Label>
              <Input
                id="programId"
                required
                disabled={mode === "edit"}
                value={form.programId}
                onChange={(e) => update("programId", e.target.value)}
                className="font-mono"
                placeholder="P-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status *</Label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => update("status", e.target.value as Status)}
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
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="targetArchetypes">Target archetypes (comma-separated)</Label>
              <Input
                id="targetArchetypes"
                value={form.targetArchetypes}
                onChange={(e) => update("targetArchetypes", e.target.value)}
                placeholder="A1, A2, A4"
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="triggerSignals">Trigger signals (comma-separated)</Label>
              <Input
                id="triggerSignals"
                value={form.triggerSignals}
                onChange={(e) => update("triggerSignals", e.target.value)}
                placeholder="S1, S3, V2"
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="priceBand">Price band *</Label>
              <Input
                id="priceBand"
                required
                value={form.priceBand}
                onChange={(e) => update("priceBand", e.target.value)}
                placeholder="$200-$2000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="moq">MOQ *</Label>
              <Input
                id="moq"
                required
                value={form.moq}
                onChange={(e) => update("moq", e.target.value)}
                placeholder="50 units"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="framing">Framing *</Label>
              <Textarea
                id="framing"
                required
                rows={3}
                value={form.framing}
                onChange={(e) => update("framing", e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="riskStructure">Risk structure</Label>
              <Textarea
                id="riskStructure"
                rows={2}
                value={form.riskStructure}
                onChange={(e) => update("riskStructure", e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={2}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
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
