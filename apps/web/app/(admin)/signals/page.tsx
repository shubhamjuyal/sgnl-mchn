import { api } from "@/lib/api";

type SignalRow = {
  signal: {
    id: number;
    signalId: string;
    accountId: number;
    signalCode: string;
    rawEvidence: string;
    signalDate: string;
    scoreContribution: number;
    isGuardrailBlocked: boolean;
    guardrailRuleFired: string | null;
    confidenceTier: string;
    sourceCount: number;
  };
  accountName: string | null;
};

export const dynamic = "force-dynamic";

export default async function SignalsPage() {
  const rows = await api.get<SignalRow[]>("/signals");
  const stats = await api.get<{
    total: number;
    candidate: number;
    validated: number;
    confirmed: number;
    blocked: number;
  }>("/signals/_/stats");

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Signals</h1>
        <div className="text-sm text-neutral-500 flex gap-4">
          <span>Total: {stats.total}</span>
          <span>Candidate: {stats.candidate}</span>
          <span>Validated: {stats.validated}</span>
          <span>Confirmed: {stats.confirmed}</span>
          <span className="text-amber-600">Blocked: {stats.blocked}</span>
        </div>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
          <tr className="border-b border-neutral-200 dark:border-neutral-800">
            <th className="py-2 pr-4">Signal ID</th>
            <th className="py-2 pr-4">Code</th>
            <th className="py-2 pr-4">Account</th>
            <th className="py-2 pr-4">Tier</th>
            <th className="py-2 pr-4">Score</th>
            <th className="py-2 pr-4">Sources</th>
            <th className="py-2 pr-4">Evidence</th>
            <th className="py-2 pr-4">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.signal.id}
              className="border-b border-neutral-100 dark:border-neutral-900 hover:bg-neutral-100/60 dark:hover:bg-neutral-900/40"
            >
              <td className="py-2 pr-4 font-mono text-xs">{r.signal.signalId}</td>
              <td className="py-2 pr-4 font-medium">{r.signal.signalCode}</td>
              <td className="py-2 pr-4">{r.accountName ?? `acct ${r.signal.accountId}`}</td>
              <td className="py-2 pr-4">
                <span
                  className={
                    r.signal.confidenceTier === "CONFIRMED"
                      ? "text-emerald-600 font-medium"
                      : r.signal.confidenceTier === "VALIDATED"
                        ? "text-blue-600"
                        : "text-neutral-500"
                  }
                >
                  {r.signal.confidenceTier}
                </span>
              </td>
              <td className="py-2 pr-4">
                {r.signal.scoreContribution.toFixed(1)}
                {r.signal.isGuardrailBlocked && (
                  <span className="ml-2 text-xs text-amber-600">
                    ({r.signal.guardrailRuleFired})
                  </span>
                )}
              </td>
              <td className="py-2 pr-4">{r.signal.sourceCount}</td>
              <td className="py-2 pr-4 max-w-md truncate text-neutral-600">
                {r.signal.rawEvidence}
              </td>
              <td className="py-2 pr-4 text-xs text-neutral-500">
                {new Date(r.signal.signalDate).toLocaleString()}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="py-8 text-center text-neutral-500">
                No signals yet. Try /manual-entry.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
