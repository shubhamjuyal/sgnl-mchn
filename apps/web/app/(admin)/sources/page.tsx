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
                <Badge
                  variant={
                    s.status === "ACTIVE"
                      ? "success"
                      : s.status === "PARTIAL"
                        ? "warning"
                        : "muted"
                  }
                >
                  {s.status}
                </Badge>
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
    </div>
  );
}
