import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  integer,
  bigserial,
  boolean,
  doublePrecision,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

// ──────────────────────────────────────────────────────────────────────────────
// ENUMS
// ──────────────────────────────────────────────────────────────────────────────

export const signalCategoryEnum = pgEnum("signal_category", [
  "structural",
  "assortment",
  "demand",
  "vendor_openness",
]);

export const signalTypeEnum = pgEnum("signal_type", ["event", "trend"]);

export const sourceStatusEnum = pgEnum("source_status", [
  "ACTIVE",
  "PARTIAL",
  "PENDING",
  "DISABLED",
]);

export const accountStatusEnum = pgEnum("account_status", [
  "active",
  "inactive",
  "excluded",
]);

export const geoMarketEnum = pgEnum("geo_market", ["US", "EU", "GULF", "APAC"]);

export const confidenceTierEnum = pgEnum("confidence_tier", [
  "CANDIDATE",
  "VALIDATED",
  "CONFIRMED",
  "EXPIRED",
]);

export const programStatusEnum = pgEnum("program_status", [
  "PHASE_1_LIVE",
  "DEVELOPMENT",
  "DEPRECATED",
]);

export const routingDestinationEnum = pgEnum("routing_destination", [
  "monitor_queue",
  "b2b_watch_queue",
  "b2b_warm_queue",
  "b2b_outreach_queue",
  "design_whisperer", // stubbed in MVP
  "phantom_testing",  // stubbed in MVP
]);

export const outreachStatusEnum = pgEnum("outreach_status", [
  "pending_human",
  "approved",
  "sent",
  "discarded",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "done",
  "failed",
  "dead",
]);

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG TABLES (human-edited via webapp)
// ──────────────────────────────────────────────────────────────────────────────

export const source = pgTable("source", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sourceName: text("source_name").notNull().unique(),
  collectionMethod: text("collection_method").notNull(), // api / scraper / manual / third_party
  targetScope: jsonb("target_scope").notNull().$type<Record<string, unknown>>(),
  geographicFilter: text("geographic_filter").notNull(),
  accountQualityFilter: jsonb("account_quality_filter").notNull().$type<Record<string, unknown>>(),
  updateFrequency: text("update_frequency").notNull(), // real_time / daily / weekly / manual
  signalJustification: text("signal_justification").notNull(),
  limitations: text("limitations").notNull(),
  status: sourceStatusEnum("status").notNull().default("PENDING"),
  cronExpression: text("cron_expression"), // null = no cron
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const archetype = pgTable("archetype", {
  code: text("code").primaryKey(), // A1..A12
  name: text("name").notNull(),
  description: text("description").notNull(),
  followerRange: text("follower_range").notNull(),
  priceTier: text("price_tier").notNull(),
  topSignals: jsonb("top_signals").notNull().$type<string[]>(),
  primaryProgramId: text("primary_program_id"),
  secondaryProgramId: text("secondary_program_id"),
  outreachChannelPriority: text("outreach_channel_priority").notNull(),
  archetypeConfidenceLogic: text("archetype_confidence_logic").notNull(),
  geographicFilter: text("geographic_filter").notNull(),
  notes: text("notes"),
});

export const account = pgTable(
  "account",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    displayName: text("display_name").notNull(),
    canonicalUrl: text("canonical_url"),
    archetype: text("archetype").references(() => archetype.code), // null until classified
    followerTier: integer("follower_tier"), // 1, 2, 3
    geographicMarket: geoMarketEnum("geographic_market").notNull().default("US"),
    priceSegment: text("price_segment"),
    accountStatus: accountStatusEnum("account_status").notNull().default("active"),
    handles: jsonb("handles").notNull().default(sql`'{}'::jsonb`).$type<{
      instagram?: string;
      website?: string;
      linkedin?: string;
      tiktok?: string;
      pinterest?: string;
      [key: string]: string | undefined;
    }>(),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }).notNull().defaultNow(),
    lastClassifiedAt: timestamp("last_classified_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("account_display_name_uniq").on(t.displayName),
    index("account_archetype_idx").on(t.archetype),
  ],
);

export const signalDictionary = pgTable("signal_dictionary", {
  code: text("code").primaryKey(), // S1..V3
  signalName: text("signal_name").notNull(),
  label: text("label").notNull(),
  category: signalCategoryEnum("category").notNull(),
  type: signalTypeEnum("type").notNull(),
  defaultWeight: integer("default_weight").notNull(),
  weightMin: integer("weight_min").notNull(),
  weightMax: integer("weight_max").notNull(),
  examplePhrases: jsonb("example_phrases").notNull().$type<string[]>(),
  guardrailNotes: text("guardrail_notes"),
  decayRule: jsonb("decay_rule").notNull().$type<{
    schedule: { upToDays: number; multiplier: number }[];
  }>(),
  programRelevance: text("program_relevance"),
  maxOccurrences: integer("max_occurrences"), // null = unlimited (events)
  occurrenceWindowDays: integer("occurrence_window_days"), // null for events
  status: text("status").notNull().default("active"),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const guardrailRule = pgTable("guardrail_rule", {
  ruleCode: text("rule_code").primaryKey(), // GR-01..GR-14
  name: text("name").notNull(),
  triggerCondition: text("trigger_condition").notNull(),
  triggerLogic: jsonb("trigger_logic").notNull().$type<{
    kind: "discard" | "cap" | "tier_cap" | "block_route";
    appliesTo: string[]; // signal codes or 'all'
    capValue?: number;
    capDimension?: "score_contribution" | "total_contribution" | "tier";
    tierCap?: "CANDIDATE" | "VALIDATED";
    requires?: { archetypeKnown?: boolean; usOnly?: boolean; cooldownActive?: boolean };
  }>(),
  signalsAffected: jsonb("signals_affected").notNull().$type<string[]>(),
  action: text("action").notNull(),
  capValue: integer("cap_value"),
  isOverridable: boolean("is_overridable").notNull().default(false),
  rationale: text("rationale").notNull(),
  enabled: boolean("enabled").notNull().default(true),
});

export const programCatalog = pgTable("program_catalog", {
  programId: text("program_id").primaryKey(), // P-001..P-009
  name: text("name").notNull(),
  status: programStatusEnum("status").notNull(),
  targetArchetypes: jsonb("target_archetypes").notNull().$type<string[]>(),
  triggerSignals: jsonb("trigger_signals").notNull().$type<string[]>(),
  priceBand: text("price_band").notNull(),
  moq: text("moq").notNull(),
  framing: text("framing").notNull(),
  riskStructure: text("risk_structure"),
  notes: text("notes"),
});

export const archetypeProgramMapping = pgTable(
  "archetype_program_mapping",
  {
    archetypeCode: text("archetype_code")
      .notNull()
      .references(() => archetype.code),
    signalCode: text("signal_code")
      .notNull()
      .references(() => signalDictionary.code),
    primaryProgramId: text("primary_program_id").references(() => programCatalog.programId),
    secondaryProgramId: text("secondary_program_id").references(() => programCatalog.programId),
    minScoreForOutreach: integer("min_score_for_outreach").notNull().default(40),
    cooldownDays: integer("cooldown_days").notNull().default(21),
    salesFraming: text("sales_framing"),
    channel: text("channel"),
    urgencyLevel: text("urgency_level"),
  },
  (t) => [primaryKey({ columns: [t.archetypeCode, t.signalCode] })],
);

export const routingRule = pgTable("routing_rule", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  priority: integer("priority").notNull(), // lower runs first
  name: text("name").notNull(),
  matchTier: confidenceTierEnum("match_tier").notNull(),
  matchSignalCategory: text("match_signal_category"), // 'trend' / 'intent' / 'any'
  matchSignalCodes: jsonb("match_signal_codes").$type<string[]>(), // null = any
  scoreMin: integer("score_min"),
  scoreMax: integer("score_max"),
  destination: routingDestinationEnum("destination").notNull(),
  humanGateRequired: boolean("human_gate_required").notNull().default(true),
  slaHours: integer("sla_hours"),
  enabled: boolean("enabled").notNull().default(true),
  notes: text("notes"),
});

export const confidenceTierRule = pgTable("confidence_tier_rule", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  // global config (single row in MVP, but allow multiple for future flexibility)
  candidateMinSources: integer("candidate_min_sources").notNull().default(1),
  validatedMinSources: integer("validated_min_sources").notNull().default(2),
  validatedAlternateMinScore: integer("validated_alternate_min_score").notNull().default(40),
  validatedAlternateSignalCodes: jsonb("validated_alternate_signal_codes")
    .notNull()
    .$type<string[]>(),
  confirmedMinSources: integer("confirmed_min_sources").notNull().default(3),
  requireVelocity: boolean("require_velocity").notNull().default(false),
  velocitySources: jsonb("velocity_sources").notNull().$type<string[]>(),
  expireAfterDaysWithoutCorroboration: integer("expire_after_days_without_corroboration")
    .notNull()
    .default(30),
  active: boolean("active").notNull().default(true),
});

export const scoringConfig = pgTable("scoring_config", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  lookbackWindowDays: integer("lookback_window_days").notNull().default(90),
  structuralLookbackDays: integer("structural_lookback_days").notNull().default(365),
  trendLookbackDays: integer("trend_lookback_days").notNull().default(60),
  freshnessWindowDays: integer("freshness_window_days").notNull().default(7),
  maxPossibleScore: integer("max_possible_score").notNull().default(100),
  // Score bands
  immediateThreshold: integer("immediate_threshold").notNull().default(60),
  highQueueThreshold: integer("high_queue_threshold").notNull().default(40),
  warmMonitorThreshold: integer("warm_monitor_threshold").notNull().default(20),
  active: boolean("active").notNull().default(true),
});

// ──────────────────────────────────────────────────────────────────────────────
// DATA TABLES (append-mostly)
// ──────────────────────────────────────────────────────────────────────────────

export const rawData = pgTable(
  "raw_data",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => source.id),
    accountId: integer("account_id")
      .notNull()
      .references(() => account.id),
    nativeId: text("native_id").notNull(), // post id, url, search query — unique per source
    content: text("content").notNull(),
    url: text("url"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull().defaultNow(),
    payloadBlobRef: text("payload_blob_ref"),
    contentHash: text("content_hash").notNull(),
    sourceMeta: jsonb("source_meta").notNull().default(sql`'{}'::jsonb`).$type<Record<string, unknown>>(),
  },
  (t) => [
    uniqueIndex("raw_data_source_native_uniq").on(t.sourceId, t.nativeId),
    index("raw_data_account_idx").on(t.accountId),
    index("raw_data_content_hash_idx").on(t.contentHash),
    index("raw_data_scraped_at_idx").on(t.scrapedAt),
  ],
);

export const signal = pgTable(
  "signal",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    signalId: text("signal_id").notNull().unique(), // SIG-YYYYMMDD-NNN
    rawDataId: integer("raw_data_id")
      .notNull()
      .references(() => rawData.id),
    accountId: integer("account_id")
      .notNull()
      .references(() => account.id),
    sourceId: integer("source_id")
      .notNull()
      .references(() => source.id),
    signalCode: text("signal_code")
      .notNull()
      .references(() => signalDictionary.code),
    matchedPhrase: text("matched_phrase"),
    rawEvidence: text("raw_evidence").notNull(),
    signalDate: timestamp("signal_date", { withTimezone: true }).notNull(),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull().defaultNow(),
    // Denormalized account context (snapshot at detection time)
    archetype: text("archetype"),
    followerTier: integer("follower_tier"),
    geoMarket: geoMarketEnum("geo_market"),
    // Scoring
    signalStrength: integer("signal_strength").notNull(), // base weight from dictionary
    scoreContribution: doublePrecision("score_contribution").notNull().default(0),
    isGuardrailBlocked: boolean("is_guardrail_blocked").notNull().default(false),
    guardrailRuleFired: text("guardrail_rule_fired"),
    // Tier
    confidenceScore: doublePrecision("confidence_score").notNull().default(0),
    confidenceTier: confidenceTierEnum("confidence_tier").notNull().default("CANDIDATE"),
    sourceCount: integer("source_count").notNull().default(1),
    velocitySource: text("velocity_source"),
    velocityValue: doublePrecision("velocity_value"),
    // Audit
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("signal_account_code_idx").on(t.accountId, t.signalCode),
    index("signal_tier_idx").on(t.confidenceTier),
    index("signal_signal_date_idx").on(t.signalDate),
    index("signal_account_idx").on(t.accountId),
  ],
);

export const accountScore = pgTable("account_score", {
  accountId: integer("account_id")
    .primaryKey()
    .references(() => account.id),
  signalScore: doublePrecision("signal_score").notNull().default(0), // 0-100
  rawSignalScore: doublePrecision("raw_signal_score").notNull().default(0),
  highestTier: confidenceTierEnum("highest_tier").notNull().default("CANDIDATE"),
  topSignals: jsonb("top_signals").notNull().default(sql`'[]'::jsonb`).$type<
    { signalId: string; signalCode: string; contribution: number }[]
  >(),
  signalsCounted: integer("signals_counted").notNull().default(0),
  lastSignalAt: timestamp("last_signal_at", { withTimezone: true }),
  isFresh: boolean("is_fresh").notNull().default(false),
  lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const outreachDraft = pgTable("outreach_draft", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  draftId: text("draft_id").notNull().unique(), // DRAFT-YYYYMMDD-NNN
  accountId: integer("account_id")
    .notNull()
    .references(() => account.id),
  signalId: text("signal_id")
    .notNull()
    .references(() => signal.signalId),
  programId: text("program_id").references(() => programCatalog.programId),
  channel: text("channel").notNull(),
  status: outreachStatusEnum("status").notNull().default("pending_human"),
  destination: routingDestinationEnum("destination").notNull(),
  draftText: text("draft_text"), // stub in MVP — null
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ──────────────────────────────────────────────────────────────────────────────
// AUDIT / LOG TABLES (write-once)
// ──────────────────────────────────────────────────────────────────────────────

export const guardrailEventLog = pgTable("guardrail_event_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  signalId: text("signal_id"), // null if signal not created (GR-01 discard)
  rawDataId: integer("raw_data_id").references(() => rawData.id),
  ruleCode: text("rule_code")
    .notNull()
    .references(() => guardrailRule.ruleCode),
  actionTaken: text("action_taken").notNull(),
  isBlocked: boolean("is_blocked").notNull(),
  capApplied: integer("cap_applied"),
  details: jsonb("details").default(sql`'{}'::jsonb`).$type<Record<string, unknown>>(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

export const tierPromotionLog = pgTable("tier_promotion_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  signalId: text("signal_id")
    .notNull()
    .references(() => signal.signalId),
  previousTier: confidenceTierEnum("previous_tier"),
  newTier: confidenceTierEnum("new_tier").notNull(),
  sourceCount: integer("source_count").notNull(),
  velocityConfirmed: boolean("velocity_confirmed").notNull().default(false),
  velocitySource: text("velocity_source"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

export const routingLog = pgTable("routing_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  signalId: text("signal_id")
    .notNull()
    .references(() => signal.signalId),
  tier: confidenceTierEnum("tier").notNull(),
  score: doublePrecision("score").notNull(),
  destination: routingDestinationEnum("destination").notNull(),
  routingRuleApplied: integer("routing_rule_applied").references(() => routingRule.id),
  outreachDraftId: text("outreach_draft_id"),
  blockedReason: text("blocked_reason"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

export const configVersionLog = pgTable("config_version_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tableName: text("table_name").notNull(),
  rowKey: text("row_key").notNull(),
  fieldChanged: text("field_changed").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  approvedBy: text("approved_by").notNull(),
  rationale: text("rationale"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

export const scrapeLog = pgTable("scrape_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sourceId: integer("source_id")
    .notNull()
    .references(() => source.id),
  recordsProcessed: integer("records_processed").notNull().default(0),
  recordsMatched: integer("records_matched").notNull().default(0),
  recordsDiscarded: integer("records_discarded").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status").notNull().default("running"),
  error: text("error"),
});

// ──────────────────────────────────────────────────────────────────────────────
// QUEUE (job table — replaces pg-boss for cleaner Python interop)
// ──────────────────────────────────────────────────────────────────────────────

export const job = pgTable(
  "job",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    type: text("type").notNull(), // 'detect', 'score_signal', 'aggregate_account', 'tier', 'route', 'scrape.instagram', etc
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
    status: jobStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    workerId: text("worker_id"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("job_pending_idx").on(t.status, t.scheduledFor),
    index("job_type_idx").on(t.type),
  ],
);

// Daily counter for SIG-YYYYMMDD-NNN minting (atomic UPDATE...RETURNING)
export const signalIdCounter = pgTable("signal_id_counter", {
  day: text("day").primaryKey(), // YYYYMMDD
  lastN: integer("last_n").notNull().default(0),
});

export const draftIdCounter = pgTable("draft_id_counter", {
  day: text("day").primaryKey(),
  lastN: integer("last_n").notNull().default(0),
});

// ──────────────────────────────────────────────────────────────────────────────
// AUTH (minimal — single-org internal tool)
// ──────────────────────────────────────────────────────────────────────────────

export const user = pgTable("app_user", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("reviewer"), // 'admin' | 'reviewer'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
