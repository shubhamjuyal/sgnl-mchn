import { api } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Account = {
  id: number;
  displayName: string;
  archetype: string | null;
  followerTier: number | null;
  geographicMarket: string;
  priceSegment: string | null;
  accountStatus: string;
  handles: Record<string, string | undefined>;
};

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const [accounts, stats] = await Promise.all([
    api.get<Account[]>("/accounts"),
    api.get<{ total: number; classified: number }>("/accounts/_/stats"),
  ]);
  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Accounts</h1>
        <div className="text-sm text-muted-foreground">
          {stats.classified}/{stats.total} classified
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Archetype</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Geo</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Handles</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.displayName}</TableCell>
              <TableCell>{a.archetype ?? "—"}</TableCell>
              <TableCell>{a.followerTier ?? "—"}</TableCell>
              <TableCell>{a.geographicMarket}</TableCell>
              <TableCell>{a.priceSegment ?? "—"}</TableCell>
              <TableCell>{a.accountStatus}</TableCell>
              <TableCell className="text-xs font-mono text-muted-foreground">
                {Object.entries(a.handles)
                  .filter(([, v]) => v)
                  .map(([k, v]) => `${k}:${v}`)
                  .join(" · ")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
