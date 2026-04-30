import { api } from "@/lib/api";

type Row = {
  accountId: number;
  displayName: string | null;
  archetype: string | null;
  signalScore: number;
  highestTier: string;
  topSignals: { signalId: string; signalCode: string; contribution: number }[];
  signalsCounted: number;
  lastSignalAt: string | null;
  isFresh: boolean;
};

export const dynamic = "force-dynamic";

export default async function ScoresPage() {
  const rows = await api.get<Row[]>("/scores");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Account scores</h1>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-neutral-500">
          <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left">
            <th className="py-2 pr-4">Account</th>
            <th className="py-2 pr-4">Archetype</th>
            <th className="py-2 pr-4">Score</th>
            <th className="py-2 pr-4">Highest tier</th>
            <th className="py-2 pr-4">Top signals</th>
            <th className="py-2 pr-4">Last signal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.accountId} className="border-b border-neutral-100 dark:border-neutral-900">
              <td className="py-2 pr-4 font-medium">
                {r.displayName ?? `acct ${r.accountId}`}
                {r.isFresh && <span className="ml-2 text-xs text-amber-600">FRESH</span>}
              </td>
              <td className="py-2 pr-4">{r.archetype ?? "—"}</td>
              <td className="py-2 pr-4 font-mono">
                {r.signalScore.toFixed(1)}
                <span className="text-xs text-neutral-500"> ({r.signalsCounted})</span>
              </td>
              <td className="py-2 pr-4">{r.highestTier}</td>
              <td className="py-2 pr-4 text-xs text-neutral-600">
                {r.topSignals
                  .slice(0, 3)
                  .map((t) => `${t.signalCode}:${t.contribution.toFixed(0)}`)
                  .join(" · ")}
              </td>
              <td className="py-2 pr-4 text-xs text-neutral-500">
                {r.lastSignalAt ? new Date(r.lastSignalAt).toLocaleString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
