import { api } from "@/lib/api";

import { DictionaryClient, type Entry } from "./dictionary-client";

export const dynamic = "force-dynamic";

export default async function DictionaryPage() {
  const rows = await api.get<Entry[]>("/dictionary");
  return <DictionaryClient initial={rows} />;
}
