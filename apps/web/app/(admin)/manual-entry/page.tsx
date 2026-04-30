import { api } from "@/lib/api";
import { ManualEntryForm } from "./form";

type Account = { id: number; displayName: string; archetype: string | null };
type SignalDef = { code: string; label: string; category: string };

export const dynamic = "force-dynamic";

export default async function ManualEntryPage() {
  const [accounts, dictionary] = await Promise.all([
    api.get<Account[]>("/accounts"),
    api.get<SignalDef[]>("/dictionary"),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Manual signal entry</h1>
      <p className="text-sm text-muted-foreground">
        Logs a raw_data row against the chosen account, then runs detection. The signal codes you
        hint at are stored as metadata; detection still phrase-matches the dictionary.
      </p>
      <ManualEntryForm accounts={accounts} dictionary={dictionary} />
    </div>
  );
}
