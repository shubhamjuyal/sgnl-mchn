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
      <DesktopOnly>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Archetype</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Highest tier</TableHead>
              <TableHead>Top signals</TableHead>
              <TableHead>Last signal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.accountId}>
                <TableCell className="font-medium">
                  {r.displayName ?? `acct ${r.accountId}`}
                  {r.isFresh && (
                    <Badge variant="warning" className="ml-2">
                      FRESH
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{r.archetype ?? "—"}</TableCell>
                <TableCell className="font-mono">
                  {r.signalScore.toFixed(1)}
                  <span className="text-xs text-muted-foreground"> ({r.signalsCounted})</span>
                </TableCell>
                <TableCell>{r.highestTier}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.topSignals
                    .slice(0, 3)
                    .map((t) => `${t.signalCode}:${t.contribution.toFixed(0)}`)
                    .join(" · ")}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {r.lastSignalAt ? new Date(r.lastSignalAt).toLocaleString() : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DesktopOnly>

      {rows.length === 0 ? (
        <MobileCardEmpty>No scored accounts yet.</MobileCardEmpty>
      ) : (
        <MobileCardList>
          {rows.map((r) => {
            const top = r.topSignals
              .slice(0, 3)
              .map((t) => `${t.signalCode}:${t.contribution.toFixed(0)}`)
              .join(" · ");
            return (
              <MobileCard
                key={r.accountId}
                title={
                  <span>
                    {r.displayName ?? `acct ${r.accountId}`}
                    {r.isFresh && (
                      <Badge variant="warning" className="ml-2">
                        FRESH
                      </Badge>
                    )}
                  </span>
                }
                meta={
                  <span className="font-mono">
                    {r.signalScore.toFixed(1)}
                    <span className="text-muted-foreground"> ({r.signalsCounted})</span>
                  </span>
                }
              >
                <MobileCardField label="Archetype">{r.archetype ?? "—"}</MobileCardField>
                <MobileCardField label="Highest tier">{r.highestTier}</MobileCardField>
                {top && (
                  <MobileCardField label="Top signals">
                    <span className="text-muted-foreground">{top}</span>
                  </MobileCardField>
                )}
                <MobileCardField label="Last signal">
                  <span className="text-muted-foreground">
                    {r.lastSignalAt ? new Date(r.lastSignalAt).toLocaleString() : "—"}
                  </span>
                </MobileCardField>
              </MobileCard>
            );
          })}
        </MobileCardList>
      )}
    </div>
  );
}
