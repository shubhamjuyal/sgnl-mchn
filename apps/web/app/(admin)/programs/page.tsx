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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Archetypes</TableHead>
            <TableHead>Trigger signals</TableHead>
            <TableHead>Price band</TableHead>
            <TableHead>MOQ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.programId}>
              <TableCell className="font-mono">{p.programId}</TableCell>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell>
                <Badge variant={p.status === "PHASE_1_LIVE" ? "success" : "muted"}>
                  {p.status}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{p.targetArchetypes.join(", ")}</TableCell>
              <TableCell className="text-xs">{p.triggerSignals.join(", ")}</TableCell>
              <TableCell className="text-xs">{p.priceBand}</TableCell>
              <TableCell className="text-xs">{p.moq}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
