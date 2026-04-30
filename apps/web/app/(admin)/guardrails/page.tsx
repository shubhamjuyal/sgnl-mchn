import { api } from "@/lib/api";

type Rule = {
  ruleCode: string;
  name: string;
  triggerCondition: string;
  signalsAffected: string[];
  action: string;
  capValue: number | null;
  isOverridable: boolean;
  rationale: string;
  enabled: boolean;
};

type Event = {
  id: number;
  signalId: string | null;
  ruleCode: string;
  actionTaken: string;
  isBlocked: boolean;
  capApplied: number | null;
  at: string;
};

export const dynamic = "force-dynamic";

export default async function GuardrailsPage() {
  const [rules, events] = await Promise.all([
    api.get<Rule[]>("/guardrails"),
    api.get<Event[]>("/guardrails/events"),
  ]);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-4">Guardrail rules</h1>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-neutral-500">
            <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Affects</th>
              <th className="py-2 pr-4">Action</th>
              <th className="py-2 pr-4">Cap</th>
              <th className="py-2 pr-4">Rationale</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.ruleCode} className="border-b border-neutral-100 dark:border-neutral-900 align-top">
                <td className="py-2 pr-4 font-mono">{r.ruleCode}</td>
                <td className="py-2 pr-4 font-medium">{r.name}</td>
                <td className="py-2 pr-4 text-xs">{r.signalsAffected.join(", ")}</td>
                <td className="py-2 pr-4 text-xs">{r.action}</td>
                <td className="py-2 pr-4">{r.capValue ?? "—"}</td>
                <td className="py-2 pr-4 text-xs text-neutral-500">{r.rationale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent events</h2>
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-neutral-500">
            <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left">
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Rule</th>
              <th className="py-2 pr-4">Action</th>
              <th className="py-2 pr-4">Signal</th>
              <th className="py-2 pr-4">Cap</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100 dark:border-neutral-900">
                <td className="py-2 pr-4 text-xs text-neutral-500">
                  {new Date(e.at).toLocaleString()}
                </td>
                <td className="py-2 pr-4 font-mono">{e.ruleCode}</td>
                <td className="py-2 pr-4">{e.actionTaken}</td>
                <td className="py-2 pr-4 font-mono text-xs">{e.signalId ?? "(discarded)"}</td>
                <td className="py-2 pr-4">{e.capApplied ?? "—"}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-neutral-500">
                  No guardrail events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
