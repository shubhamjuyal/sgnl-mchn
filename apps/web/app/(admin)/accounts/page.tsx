import { api } from "@/lib/api";

type Account = {
  id: number;
  displayName: string;
  archetype: string | null;
  followerTier: number | null;
  geographicMarket: string;
  priceSegment: string | null;
  accountStatus: string;
  handles: Record<string, string | undefined>;
};

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const [accounts, stats] = await Promise.all([
    api.get<Account[]>("/accounts"),
    api.get<{ total: number; classified: number }>("/accounts/_/stats"),
  ]);
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Accounts</h1>
        <div className="text-sm text-neutral-500">
          {stats.classified}/{stats.total} classified
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-neutral-500">
          <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Archetype</th>
            <th className="py-2 pr-4">Tier</th>
            <th className="py-2 pr-4">Geo</th>
            <th className="py-2 pr-4">Price</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Handles</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id} className="border-b border-neutral-100 dark:border-neutral-900">
              <td className="py-2 pr-4 font-medium">{a.displayName}</td>
              <td className="py-2 pr-4">{a.archetype ?? "—"}</td>
              <td className="py-2 pr-4">{a.followerTier ?? "—"}</td>
              <td className="py-2 pr-4">{a.geographicMarket}</td>
              <td className="py-2 pr-4">{a.priceSegment ?? "—"}</td>
              <td className="py-2 pr-4">{a.accountStatus}</td>
              <td className="py-2 pr-4 text-xs font-mono text-neutral-500">
                {Object.entries(a.handles)
                  .filter(([, v]) => v)
                  .map(([k, v]) => `${k}:${v}`)
                  .join(" · ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
