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

function statusVariant(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "PARTIAL") return "warning" as const;
  return "muted" as const;
}

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
      <DesktopOnly>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Cron</TableHead>
              <TableHead>Last run</TableHead>
              <TableHead>Justification</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.sourceName}</TableCell>
                <TableCell>{s.collectionMethod}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                </TableCell>
                <TableCell>{s.updateFrequency}</TableCell>
                <TableCell className="font-mono text-xs">{s.cronExpression ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {s.lastRunAt ? new Date(s.lastRunAt).toLocaleString() : "never"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-md">
                  {s.signalJustification}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DesktopOnly>

      {rows.length === 0 ? (
        <MobileCardEmpty>No sources configured.</MobileCardEmpty>
      ) : (
        <MobileCardList>
          {rows.map((s) => (
            <MobileCard
              key={s.id}
              title={s.sourceName}
              meta={<Badge variant={statusVariant(s.status)}>{s.status}</Badge>}
            >
              <MobileCardField label="Method">{s.collectionMethod}</MobileCardField>
              <MobileCardField label="Frequency">{s.updateFrequency}</MobileCardField>
              <MobileCardField label="Cron">
                <span className="font-mono">{s.cronExpression ?? "—"}</span>
              </MobileCardField>
              <MobileCardField label="Last run">
                <span className="text-muted-foreground">
                  {s.lastRunAt ? new Date(s.lastRunAt).toLocaleString() : "never"}
                </span>
              </MobileCardField>
              <MobileCardField label="Justification">
                <span className="text-muted-foreground">{s.signalJustification}</span>
              </MobileCardField>
            </MobileCard>
          ))}
        </MobileCardList>
      )}
    </div>
  );
}
