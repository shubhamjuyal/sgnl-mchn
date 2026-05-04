import type { ReactNode } from "react";

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

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell nav={NAV}>{children}</AdminShell>;
}
