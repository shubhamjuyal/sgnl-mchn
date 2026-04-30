import { api } from "@/lib/api";

type Program = {
  programId: string;
  name: string;
  status: string;
  targetArchetypes: string[];
  triggerSignals: string[];
  priceBand: string;
  moq: string;
  framing: string;
};

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const rows = await api.get<Program[]>("/programs");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Program catalog</h1>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-neutral-500">
          <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left">
            <th className="py-2 pr-4">ID</th>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Archetypes</th>
            <th className="py-2 pr-4">Trigger signals</th>
            <th className="py-2 pr-4">Price band</th>
            <th className="py-2 pr-4">MOQ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.programId} className="border-b border-neutral-100 dark:border-neutral-900">
              <td className="py-2 pr-4 font-mono">{p.programId}</td>
              <td className="py-2 pr-4 font-medium">{p.name}</td>
              <td className="py-2 pr-4">
                <span
                  className={
                    p.status === "PHASE_1_LIVE" ? "text-emerald-600" : "text-neutral-500"
                  }
                >
                  {p.status}
                </span>
              </td>
              <td className="py-2 pr-4 text-xs">{p.targetArchetypes.join(", ")}</td>
              <td className="py-2 pr-4 text-xs">{p.triggerSignals.join(", ")}</td>
              <td className="py-2 pr-4 text-xs">{p.priceBand}</td>
              <td className="py-2 pr-4 text-xs">{p.moq}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
