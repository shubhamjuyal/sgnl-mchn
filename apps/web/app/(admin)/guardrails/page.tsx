import { api } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DesktopOnly,
  MobileCard,
  MobileCardEmpty,
  MobileCardField,
  MobileCardList,
} from "@/components/ui/mobile-card";

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
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Guardrail rules</h1>
        <DesktopOnly>
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
        </DesktopOnly>

        {rules.length === 0 ? (
          <MobileCardEmpty>No guardrail rules.</MobileCardEmpty>
        ) : (
          <MobileCardList>
            {rules.map((r) => (
              <MobileCard
                key={r.ruleCode}
                title={r.name}
                meta={<span className="font-mono text-muted-foreground">{r.ruleCode}</span>}
              >
                <MobileCardField label="Affects">
                  {r.signalsAffected.join(", ") || "—"}
                </MobileCardField>
                <MobileCardField label="Action">{r.action}</MobileCardField>
                <MobileCardField label="Cap">{r.capValue ?? "—"}</MobileCardField>
                <MobileCardField label="Rationale">
                  <span className="text-muted-foreground">{r.rationale}</span>
                </MobileCardField>
              </MobileCard>
            ))}
          </MobileCardList>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent events</h2>
        <DesktopOnly>
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
        </DesktopOnly>

        {events.length === 0 ? (
          <MobileCardEmpty>No guardrail events yet.</MobileCardEmpty>
        ) : (
          <MobileCardList>
            {events.map((e) => (
              <MobileCard
                key={e.id}
                title={<span className="font-mono">{e.ruleCode}</span>}
                meta={
                  <span className="text-muted-foreground">
                    {new Date(e.at).toLocaleString()}
                  </span>
                }
              >
                <MobileCardField label="Action">{e.actionTaken}</MobileCardField>
                <MobileCardField label="Signal">
                  <span className="font-mono">{e.signalId ?? "(discarded)"}</span>
                </MobileCardField>
                <MobileCardField label="Cap">{e.capApplied ?? "—"}</MobileCardField>
              </MobileCard>
            ))}
          </MobileCardList>
        )}
      </div>
    </div>
  );
}
