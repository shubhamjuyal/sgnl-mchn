import { api } from "@/lib/api";

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
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-neutral-500">
          <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left">
            <th className="py-2 pr-4">Code</th>
            <th className="py-2 pr-4">Label</th>
            <th className="py-2 pr-4">Category</th>
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Weight</th>
            <th className="py-2 pr-4">Cap</th>
            <th className="py-2 pr-4">Example phrases</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code} className="border-b border-neutral-100 dark:border-neutral-900 align-top">
              <td className="py-2 pr-4 font-mono">{r.code}</td>
              <td className="py-2 pr-4 font-medium">{r.label}</td>
              <td className="py-2 pr-4 text-xs">{r.category}</td>
              <td className="py-2 pr-4 text-xs">{r.type}</td>
              <td className="py-2 pr-4">
                {r.defaultWeight}
                <span className="text-xs text-neutral-500 ml-1">
                  ({r.weightMin}–{r.weightMax})
                </span>
              </td>
              <td className="py-2 pr-4 text-xs">
                {r.maxOccurrences != null
                  ? `${r.maxOccurrences}/${r.occurrenceWindowDays ?? "—"}d`
                  : "—"}
              </td>
              <td className="py-2 pr-4 text-xs text-neutral-500">
                {r.examplePhrases.slice(0, 4).join(" · ")}
                {r.examplePhrases.length > 4 && ` …+${r.examplePhrases.length - 4}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
