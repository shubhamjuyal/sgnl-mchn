import { api } from "@/lib/api";

type LogRow = {
  id: number;
  signalId: string;
  tier: string;
  score: number;
  destination: string;
  blockedReason: string | null;
  at: string;
};

export const dynamic = "force-dynamic";

export default async function RoutingPage() {
  const log = await api.get<LogRow[]>("/routing/log");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Routing log</h1>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-neutral-500">
          <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left">
            <th className="py-2 pr-4">When</th>
            <th className="py-2 pr-4">Signal</th>
            <th className="py-2 pr-4">Tier</th>
            <th className="py-2 pr-4">Score</th>
            <th className="py-2 pr-4">Destination</th>
            <th className="py-2 pr-4">Blocked reason</th>
          </tr>
        </thead>
        <tbody>
          {log.map((r) => (
            <tr key={r.id} className="border-b border-neutral-100 dark:border-neutral-900">
              <td className="py-2 pr-4 text-xs text-neutral-500">
                {new Date(r.at).toLocaleString()}
              </td>
              <td className="py-2 pr-4 font-mono text-xs">{r.signalId}</td>
              <td className="py-2 pr-4">{r.tier}</td>
              <td className="py-2 pr-4 font-mono">{r.score.toFixed(1)}</td>
              <td className="py-2 pr-4">{r.destination}</td>
              <td className="py-2 pr-4 text-xs text-amber-600">{r.blockedReason ?? "—"}</td>
            </tr>
          ))}
          {log.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-neutral-500">
                No routing decisions yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
