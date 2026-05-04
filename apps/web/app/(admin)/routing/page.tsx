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
      <DesktopOnly>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Signal</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Blocked reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {log.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(r.at).toLocaleString()}
                </TableCell>
                <TableCell className="font-mono text-xs">{r.signalId}</TableCell>
                <TableCell>{r.tier}</TableCell>
                <TableCell className="font-mono">{r.score.toFixed(1)}</TableCell>
                <TableCell>{r.destination}</TableCell>
                <TableCell className="text-xs text-amber-400">{r.blockedReason ?? "—"}</TableCell>
              </TableRow>
            ))}
            {log.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No routing decisions yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DesktopOnly>

      {log.length === 0 ? (
        <MobileCardEmpty>No routing decisions yet.</MobileCardEmpty>
      ) : (
        <MobileCardList>
          {log.map((r) => (
            <MobileCard
              key={r.id}
              title={<span className="font-mono text-sm">{r.signalId}</span>}
              meta={
                <span className="text-muted-foreground">
                  {new Date(r.at).toLocaleString()}
                </span>
              }
            >
              <MobileCardField label="Tier">{r.tier}</MobileCardField>
              <MobileCardField label="Score">
                <span className="font-mono">{r.score.toFixed(1)}</span>
              </MobileCardField>
              <MobileCardField label="Destination">{r.destination}</MobileCardField>
              <MobileCardField label="Blocked">
                <span className="text-amber-400">{r.blockedReason ?? "—"}</span>
              </MobileCardField>
            </MobileCard>
          ))}
        </MobileCardList>
      )}
    </div>
  );
}
