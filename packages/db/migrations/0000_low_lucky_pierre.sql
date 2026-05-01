CREATE TYPE "public"."account_status" AS ENUM('active', 'inactive', 'excluded');--> statement-breakpoint
CREATE TYPE "public"."confidence_tier" AS ENUM('CANDIDATE', 'VALIDATED', 'CONFIRMED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."geo_market" AS ENUM('US', 'EU', 'GULF', 'APAC');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'processing', 'done', 'failed', 'dead');--> statement-breakpoint
CREATE TYPE "public"."outreach_status" AS ENUM('pending_human', 'approved', 'sent', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."program_status" AS ENUM('PHASE_1_LIVE', 'DEVELOPMENT', 'DEPRECATED');--> statement-breakpoint
CREATE TYPE "public"."routing_destination" AS ENUM('monitor_queue', 'b2b_watch_queue', 'b2b_warm_queue', 'b2b_outreach_queue', 'design_whisperer', 'phantom_testing');--> statement-breakpoint
CREATE TYPE "public"."signal_category" AS ENUM('structural', 'assortment', 'demand', 'vendor_openness');--> statement-breakpoint
CREATE TYPE "public"."signal_type" AS ENUM('event', 'trend');--> statement-breakpoint
CREATE TYPE "public"."source_status" AS ENUM('ACTIVE', 'PARTIAL', 'PENDING', 'DISABLED');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"canonical_url" text,
	"archetype" text,
	"follower_tier" integer,
	"geographic_market" "geo_market" DEFAULT 'US' NOT NULL,
	"price_segment" text,
	"account_status" "account_status" DEFAULT 'active' NOT NULL,
	"handles" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"onboarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_classified_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account_score" (
	"account_id" integer PRIMARY KEY NOT NULL,
	"signal_score" double precision DEFAULT 0 NOT NULL,
	"raw_signal_score" double precision DEFAULT 0 NOT NULL,
	"highest_tier" "confidence_tier" DEFAULT 'CANDIDATE' NOT NULL,
	"top_signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"signals_counted" integer DEFAULT 0 NOT NULL,
	"last_signal_at" timestamp with time zone,
	"is_fresh" boolean DEFAULT false NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "archetype" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"follower_range" text NOT NULL,
	"price_tier" text NOT NULL,
	"top_signals" jsonb NOT NULL,
	"primary_program_id" text,
	"secondary_program_id" text,
	"outreach_channel_priority" text NOT NULL,
	"archetype_confidence_logic" text NOT NULL,
	"geographic_filter" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "archetype_program_mapping" (
	"archetype_code" text NOT NULL,
	"signal_code" text NOT NULL,
	"primary_program_id" text,
	"secondary_program_id" text,
	"min_score_for_outreach" integer DEFAULT 40 NOT NULL,
	"cooldown_days" integer DEFAULT 21 NOT NULL,
	"sales_framing" text,
	"channel" text,
	"urgency_level" text,
	CONSTRAINT "archetype_program_mapping_archetype_code_signal_code_pk" PRIMARY KEY("archetype_code","signal_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "confidence_tier_rule" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"candidate_min_sources" integer DEFAULT 1 NOT NULL,
	"validated_min_sources" integer DEFAULT 2 NOT NULL,
	"validated_alternate_min_score" integer DEFAULT 40 NOT NULL,
	"validated_alternate_signal_codes" jsonb NOT NULL,
	"confirmed_min_sources" integer DEFAULT 3 NOT NULL,
	"require_velocity" boolean DEFAULT false NOT NULL,
	"velocity_sources" jsonb NOT NULL,
	"expire_after_days_without_corroboration" integer DEFAULT 30 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "config_version_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"table_name" text NOT NULL,
	"row_key" text NOT NULL,
	"field_changed" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"approved_by" text NOT NULL,
	"rationale" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "draft_id_counter" (
	"day" text PRIMARY KEY NOT NULL,
	"last_n" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guardrail_event_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"signal_id" text,
	"raw_data_id" integer,
	"rule_code" text NOT NULL,
	"action_taken" text NOT NULL,
	"is_blocked" boolean NOT NULL,
	"cap_applied" integer,
	"details" jsonb DEFAULT '{}'::jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guardrail_rule" (
	"rule_code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"trigger_condition" text NOT NULL,
	"trigger_logic" jsonb NOT NULL,
	"signals_affected" jsonb NOT NULL,
	"action" text NOT NULL,
	"cap_value" integer,
	"is_overridable" boolean DEFAULT false NOT NULL,
	"rationale" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"scheduled_for" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"worker_id" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outreach_draft" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"draft_id" text NOT NULL,
	"account_id" integer NOT NULL,
	"signal_id" text NOT NULL,
	"program_id" text,
	"channel" text NOT NULL,
	"status" "outreach_status" DEFAULT 'pending_human' NOT NULL,
	"destination" "routing_destination" NOT NULL,
	"draft_text" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outreach_draft_draft_id_unique" UNIQUE("draft_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "program_catalog" (
	"program_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" "program_status" NOT NULL,
	"target_archetypes" jsonb NOT NULL,
	"trigger_signals" jsonb NOT NULL,
	"price_band" text NOT NULL,
	"moq" text NOT NULL,
	"framing" text NOT NULL,
	"risk_structure" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "raw_data" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"native_id" text NOT NULL,
	"content" text NOT NULL,
	"url" text,
	"posted_at" timestamp with time zone,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload_blob_ref" text,
	"content_hash" text NOT NULL,
	"source_meta" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "routing_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"signal_id" text NOT NULL,
	"tier" "confidence_tier" NOT NULL,
	"score" double precision NOT NULL,
	"destination" "routing_destination" NOT NULL,
	"routing_rule_applied" integer,
	"outreach_draft_id" text,
	"blocked_reason" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "routing_rule" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"priority" integer NOT NULL,
	"name" text NOT NULL,
	"match_tier" "confidence_tier" NOT NULL,
	"match_signal_category" text,
	"match_signal_codes" jsonb,
	"score_min" integer,
	"score_max" integer,
	"destination" "routing_destination" NOT NULL,
	"human_gate_required" boolean DEFAULT true NOT NULL,
	"sla_hours" integer,
	"enabled" boolean DEFAULT true NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scoring_config" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"lookback_window_days" integer DEFAULT 90 NOT NULL,
	"structural_lookback_days" integer DEFAULT 365 NOT NULL,
	"trend_lookback_days" integer DEFAULT 60 NOT NULL,
	"freshness_window_days" integer DEFAULT 7 NOT NULL,
	"max_possible_score" integer DEFAULT 100 NOT NULL,
	"immediate_threshold" integer DEFAULT 60 NOT NULL,
	"high_queue_threshold" integer DEFAULT 40 NOT NULL,
	"warm_monitor_threshold" integer DEFAULT 20 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scrape_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"records_processed" integer DEFAULT 0 NOT NULL,
	"records_matched" integer DEFAULT 0 NOT NULL,
	"records_discarded" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "signal" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"signal_id" text NOT NULL,
	"raw_data_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"source_id" integer NOT NULL,
	"signal_code" text NOT NULL,
	"matched_phrase" text,
	"raw_evidence" text NOT NULL,
	"signal_date" timestamp with time zone NOT NULL,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archetype" text,
	"follower_tier" integer,
	"geo_market" "geo_market",
	"signal_strength" integer NOT NULL,
	"score_contribution" double precision DEFAULT 0 NOT NULL,
	"is_guardrail_blocked" boolean DEFAULT false NOT NULL,
	"guardrail_rule_fired" text,
	"confidence_score" double precision DEFAULT 0 NOT NULL,
	"confidence_tier" "confidence_tier" DEFAULT 'CANDIDATE' NOT NULL,
	"source_count" integer DEFAULT 1 NOT NULL,
	"velocity_source" text,
	"velocity_value" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signal_signal_id_unique" UNIQUE("signal_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "signal_dictionary" (
	"code" text PRIMARY KEY NOT NULL,
	"signal_name" text NOT NULL,
	"label" text NOT NULL,
	"category" "signal_category" NOT NULL,
	"type" "signal_type" NOT NULL,
	"default_weight" integer NOT NULL,
	"weight_min" integer NOT NULL,
	"weight_max" integer NOT NULL,
	"example_phrases" jsonb NOT NULL,
	"guardrail_notes" text,
	"decay_rule" jsonb NOT NULL,
	"program_relevance" text,
	"max_occurrences" integer,
	"occurrence_window_days" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "signal_id_counter" (
	"day" text PRIMARY KEY NOT NULL,
	"last_n" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "source" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source_name" text NOT NULL,
	"collection_method" text NOT NULL,
	"target_scope" jsonb NOT NULL,
	"geographic_filter" text NOT NULL,
	"account_quality_filter" jsonb NOT NULL,
	"update_frequency" text NOT NULL,
	"signal_justification" text NOT NULL,
	"limitations" text NOT NULL,
	"status" "source_status" DEFAULT 'PENDING' NOT NULL,
	"cron_expression" text,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_source_name_unique" UNIQUE("source_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tier_promotion_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"signal_id" text NOT NULL,
	"previous_tier" "confidence_tier",
	"new_tier" "confidence_tier" NOT NULL,
	"source_count" integer NOT NULL,
	"velocity_confirmed" boolean DEFAULT false NOT NULL,
	"velocity_source" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_user" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"role" text DEFAULT 'reviewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account" ADD CONSTRAINT "account_archetype_archetype_code_fk" FOREIGN KEY ("archetype") REFERENCES "public"."archetype"("code") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "account_score" ADD CONSTRAINT "account_score_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "archetype_program_mapping" ADD CONSTRAINT "archetype_program_mapping_archetype_code_archetype_code_fk" FOREIGN KEY ("archetype_code") REFERENCES "public"."archetype"("code") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "archetype_program_mapping" ADD CONSTRAINT "archetype_program_mapping_signal_code_signal_dictionary_code_fk" FOREIGN KEY ("signal_code") REFERENCES "public"."signal_dictionary"("code") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "archetype_program_mapping" ADD CONSTRAINT "archetype_program_mapping_primary_program_id_program_catalog_program_id_fk" FOREIGN KEY ("primary_program_id") REFERENCES "public"."program_catalog"("program_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "archetype_program_mapping" ADD CONSTRAINT "archetype_program_mapping_secondary_program_id_program_catalog_program_id_fk" FOREIGN KEY ("secondary_program_id") REFERENCES "public"."program_catalog"("program_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guardrail_event_log" ADD CONSTRAINT "guardrail_event_log_raw_data_id_raw_data_id_fk" FOREIGN KEY ("raw_data_id") REFERENCES "public"."raw_data"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guardrail_event_log" ADD CONSTRAINT "guardrail_event_log_rule_code_guardrail_rule_rule_code_fk" FOREIGN KEY ("rule_code") REFERENCES "public"."guardrail_rule"("rule_code") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outreach_draft" ADD CONSTRAINT "outreach_draft_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outreach_draft" ADD CONSTRAINT "outreach_draft_signal_id_signal_signal_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signal"("signal_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "outreach_draft" ADD CONSTRAINT "outreach_draft_program_id_program_catalog_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program_catalog"("program_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "raw_data" ADD CONSTRAINT "raw_data_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "raw_data" ADD CONSTRAINT "raw_data_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "routing_log" ADD CONSTRAINT "routing_log_signal_id_signal_signal_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signal"("signal_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "routing_log" ADD CONSTRAINT "routing_log_routing_rule_applied_routing_rule_id_fk" FOREIGN KEY ("routing_rule_applied") REFERENCES "public"."routing_rule"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scrape_log" ADD CONSTRAINT "scrape_log_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signal" ADD CONSTRAINT "signal_raw_data_id_raw_data_id_fk" FOREIGN KEY ("raw_data_id") REFERENCES "public"."raw_data"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signal" ADD CONSTRAINT "signal_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signal" ADD CONSTRAINT "signal_source_id_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."source"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signal" ADD CONSTRAINT "signal_signal_code_signal_dictionary_code_fk" FOREIGN KEY ("signal_code") REFERENCES "public"."signal_dictionary"("code") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tier_promotion_log" ADD CONSTRAINT "tier_promotion_log_signal_id_signal_signal_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signal"("signal_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "account_display_name_uniq" ON "account" USING btree ("display_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_archetype_idx" ON "account" USING btree ("archetype");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_pending_idx" ON "job" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_type_idx" ON "job" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "raw_data_source_native_uniq" ON "raw_data" USING btree ("source_id","native_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "raw_data_account_idx" ON "raw_data" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "raw_data_content_hash_idx" ON "raw_data" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "raw_data_scraped_at_idx" ON "raw_data" USING btree ("scraped_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signal_account_code_idx" ON "signal" USING btree ("account_id","signal_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signal_tier_idx" ON "signal" USING btree ("confidence_tier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signal_signal_date_idx" ON "signal" USING btree ("signal_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signal_account_idx" ON "signal" USING btree ("account_id");