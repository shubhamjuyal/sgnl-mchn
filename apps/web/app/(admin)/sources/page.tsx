import { api } from "@/lib/api";

type Source = {
  id: number;
  sourceName: string;
  collectionMethod: string;
  status: string;
  updateFrequency: string;
  cronExpression: string | null;
  lastRunAt: string | null;
  signalJustification: string;
  limitations: string;
};

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const rows = await api.get<Source[]>("/sources");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Sources</h1>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-neutral-500">
          <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Method</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Frequency</th>
            <th className="py-2 pr-4">Cron</th>
            <th className="py-2 pr-4">Last run</th>
            <th className="py-2 pr-4">Justification</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-b border-neutral-100 dark:border-neutral-900">
              <td className="py-2 pr-4 font-medium">{s.sourceName}</td>
              <td className="py-2 pr-4">{s.collectionMethod}</td>
              <td className="py-2 pr-4">
                <span
                  className={
                    s.status === "ACTIVE"
                      ? "text-emerald-600"
                      : s.status === "PARTIAL"
                        ? "text-amber-600"
                        : "text-neutral-500"
                  }
                >
                  {s.status}
                </span>
              </td>
              <td className="py-2 pr-4">{s.updateFrequency}</td>
              <td className="py-2 pr-4 font-mono text-xs">{s.cronExpression ?? "—"}</td>
              <td className="py-2 pr-4 text-xs text-neutral-500">
                {s.lastRunAt ? new Date(s.lastRunAt).toLocaleString() : "never"}
              </td>
              <td className="py-2 pr-4 text-xs text-neutral-500 max-w-md">
                {s.signalJustification}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
