import { db, job } from "@sgnl/db";

export type JobType =
  | "scrape.instagram"
  | "scrape.website"
  | "detect"
  | "score_signal"
  | "aggregate_account"
  | "tier"
  | "route";

export type JobPayloads = {
  "scrape.instagram": { sourceId: number; accountIds?: number[] };
  "scrape.website": { sourceId: number; accountIds?: number[] };
  detect: { rawDataId: number };
  score_signal: { signalId: string };
  aggregate_account: { accountId: number };
  tier: { signalId: string };
  route: { signalId: string };
};

export interface JobBus {
  enqueue<T extends JobType>(type: T, payload: JobPayloads[T], opts?: { runAt?: Date }): Promise<number>;
}

class PostgresJobBus implements JobBus {
  async enqueue<T extends JobType>(type: T, payload: JobPayloads[T], opts?: { runAt?: Date }) {
    const [row] = await db
      .insert(job)
      .values({
        type,
        payload: payload as Record<string, unknown>,
        scheduledFor: opts?.runAt ?? new Date(),
      })
      .returning({ id: job.id });
    if (!row) throw new Error("Failed to enqueue job");
    return row.id;
  }
}

export const bus: JobBus = new PostgresJobBus();
