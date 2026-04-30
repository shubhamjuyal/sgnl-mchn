import { api } from "@/lib/api";

import { ProgramsClient, type Program } from "./programs-client";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const rows = await api.get<Program[]>("/programs");
  return <ProgramsClient initial={rows} />;
}
