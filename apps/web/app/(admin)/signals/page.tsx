import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
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
      <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
        <h1 className="text-2xl font-semibold">Signals</h1>
        <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
          <span>Total: {stats.total}</span>
          <span>Candidate: {stats.candidate}</span>
          <span>Validated: {stats.validated}</span>
          <span>Confirmed: {stats.confirmed}</span>
          <span className="text-amber-400">Blocked: {stats.blocked}</span>
        </div>
      </div>

      <DesktopOnly>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Signal ID</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Sources</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.signal.id}>
                <TableCell className="font-mono text-xs">{r.signal.signalId}</TableCell>
                <TableCell className="font-medium">{r.signal.signalCode}</TableCell>
                <TableCell>{r.accountName ?? `acct ${r.signal.accountId}`}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      r.signal.confidenceTier === "CONFIRMED"
                        ? "success"
                        : r.signal.confidenceTier === "VALIDATED"
                          ? "info"
                          : "muted"
                    }
                  >
                    {r.signal.confidenceTier}
                  </Badge>
                </TableCell>
                <TableCell>
                  {r.signal.scoreContribution.toFixed(1)}
                  {r.signal.isGuardrailBlocked && (
                    <span className="ml-2 text-xs text-amber-400">
                      ({r.signal.guardrailRuleFired})
                    </span>
                  )}
                </TableCell>
                <TableCell>{r.signal.sourceCount}</TableCell>
                <TableCell className="max-w-md truncate text-muted-foreground">
                  {r.signal.rawEvidence}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(r.signal.signalDate).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No signals yet. Try /manual-entry.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DesktopOnly>

      {rows.length === 0 ? (
        <MobileCardEmpty>No signals yet. Try /manual-entry.</MobileCardEmpty>
      ) : (
        <MobileCardList>
          {rows.map((r) => (
            <MobileCard
              key={r.signal.id}
              title={
                <span>
                  <span className="font-medium">{r.signal.signalCode}</span>
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {r.accountName ?? `acct ${r.signal.accountId}`}
                  </span>
                </span>
              }
              meta={
                <Badge
                  variant={
                    r.signal.confidenceTier === "CONFIRMED"
                      ? "success"
                      : r.signal.confidenceTier === "VALIDATED"
                        ? "info"
                        : "muted"
                  }
                >
                  {r.signal.confidenceTier}
                </Badge>
              }
            >
              <MobileCardField label="Signal ID">
                <span className="font-mono">{r.signal.signalId}</span>
              </MobileCardField>
              <MobileCardField label="Score">
                {r.signal.scoreContribution.toFixed(1)}
                {r.signal.isGuardrailBlocked && (
                  <span className="ml-2 text-amber-400">
                    ({r.signal.guardrailRuleFired})
                  </span>
                )}
              </MobileCardField>
              <MobileCardField label="Sources">
                {r.signal.sourceCount}
              </MobileCardField>
              <MobileCardField label="Evidence">
                <span className="text-muted-foreground">{r.signal.rawEvidence}</span>
              </MobileCardField>
              <MobileCardField label="Date">
                <span className="text-muted-foreground">
                  {new Date(r.signal.signalDate).toLocaleString()}
                </span>
              </MobileCardField>
            </MobileCard>
          ))}
        </MobileCardList>
      )}
    </div>
  );
}
