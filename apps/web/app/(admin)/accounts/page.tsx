import { api } from "@/lib/api";

import { AccountsClient, type Account } from "./accounts-client";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const [accounts, stats] = await Promise.all([
    api.get<Account[]>("/accounts"),
    api.get<{ total: number; classified: number }>("/accounts/_/stats"),
  ]);
  return <AccountsClient initialAccounts={accounts} initialStats={stats} />;
}
