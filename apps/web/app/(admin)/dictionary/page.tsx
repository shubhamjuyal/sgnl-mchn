import { api } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Entry = {
  code: string;
  signalName: string;
  label: string;
  category: string;
  type: string;
  defaultWeight: number;
  weightMin: number;
  weightMax: number;
  examplePhrases: string[];
  maxOccurrences: number | null;
  occurrenceWindowDays: number | null;
  status: string;
  version: number;
};

export const dynamic = "force-dynamic";

export default async function DictionaryPage() {
  const rows = await api.get<Entry[]>("/dictionary");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Signal dictionary</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Label</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Cap</TableHead>
            <TableHead>Example phrases</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.code} className="align-top">
              <TableCell className="font-mono">{r.code}</TableCell>
              <TableCell className="font-medium">{r.label}</TableCell>
              <TableCell className="text-xs">{r.category}</TableCell>
              <TableCell className="text-xs">{r.type}</TableCell>
              <TableCell>
                {r.defaultWeight}
                <span className="text-xs text-muted-foreground ml-1">
                  ({r.weightMin}–{r.weightMax})
                </span>
              </TableCell>
              <TableCell className="text-xs">
                {r.maxOccurrences != null
                  ? `${r.maxOccurrences}/${r.occurrenceWindowDays ?? "—"}d`
                  : "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {r.examplePhrases.slice(0, 4).join(" · ")}
                {r.examplePhrases.length > 4 && ` …+${r.examplePhrases.length - 4}`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
