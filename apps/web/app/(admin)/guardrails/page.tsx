import { api } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Affects</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Cap</TableHead>
              <TableHead>Rationale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((r) => (
              <TableRow key={r.ruleCode} className="align-top">
                <TableCell className="font-mono">{r.ruleCode}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-xs">{r.signalsAffected.join(", ")}</TableCell>
                <TableCell className="text-xs">{r.action}</TableCell>
                <TableCell>{r.capValue ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.rationale}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent events</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Signal</TableHead>
              <TableHead>Cap</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(e.at).toLocaleString()}
                </TableCell>
                <TableCell className="font-mono">{e.ruleCode}</TableCell>
                <TableCell>{e.actionTaken}</TableCell>
                <TableCell className="font-mono text-xs">{e.signalId ?? "(discarded)"}</TableCell>
                <TableCell>{e.capApplied ?? "—"}</TableCell>
              </TableRow>
            ))}
            {events.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  No guardrail events yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
