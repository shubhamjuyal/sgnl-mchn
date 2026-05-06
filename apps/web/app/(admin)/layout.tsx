import type { ReactNode } from "react";

import { api } from "@/lib/api";
import { AdminShell } from "./admin-shell";

const NAV = [
  { href: "/signals", label: "Signals" },
  { href: "/scores", label: "Scores" },
  { href: "/manual-entry", label: "Manual entry" },
  { href: "/sources", label: "Sources" },
  { href: "/accounts", label: "Accounts" },
  { href: "/dictionary", label: "Dictionary" },
  { href: "/guardrails", label: "Guardrails" },
  { href: "/programs", label: "Programs" },
  { href: "/routing", label: "Routing" },
];

type Me = { user: { id: number; email: string; displayName: string; role: string } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const me = await api.get<Me>("/auth/me");
  return (
    <AdminShell nav={NAV} user={me.user}>
      {children}
    </AdminShell>
  );
}
