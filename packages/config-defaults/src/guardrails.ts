// Sheet 05 — Guardrail Rules. GR-01 through GR-14.

export type GuardrailDef = {
  ruleCode: string;
  name: string;
  triggerCondition: string;
  triggerLogic: {
    kind: "discard" | "cap" | "tier_cap" | "block_route";
    appliesTo: string[]; // signal codes or 'all'
    capValue?: number;
    capDimension?: "score_contribution" | "total_contribution" | "tier";
    tierCap?: "CANDIDATE" | "VALIDATED";
    requires?: { archetypeKnown?: boolean; usOnly?: boolean; cooldownActive?: boolean };
  };
  signalsAffected: string[];
  action: string;
  capValue: number | null;
  isOverridable: boolean;
  rationale: string;
};

export const GUARDRAILS: GuardrailDef[] = [
  {
    ruleCode: "GR-01",
    name: "Generic post discard",
    triggerCondition: "Single generic 'new arrivals' post (no category specificity)",
    triggerLogic: { kind: "discard", appliesTo: ["all"] },
    signalsAffected: ["all"],
    action: "Signal NOT created. Discarded at detection.",
    capValue: null,
    isOverridable: false,
    rationale: "New arrivals is not a buying signal. Retailer is just posting product.",
  },
  {
    ruleCode: "GR-02",
    name: "Generic holiday promo cap",
    triggerCondition: "Generic holiday promotion (Mother's Day, Valentine's etc.) with no other signal",
    triggerLogic: {
      kind: "cap",
      appliesTo: ["D1", "D2", "A4"],
      capValue: 10,
      capDimension: "score_contribution",
    },
    signalsAffected: ["D1", "D2", "A4"],
    action: "Signal created but score contribution capped at <= 10.",
    capValue: 10,
    isOverridable: false,
    rationale: "Holiday promos inflate trend signals falsely. Require category-specific language.",
  },
  {
    ruleCode: "GR-03",
    name: "Repost cap",
    triggerCondition: "Random product repost without business change narrative",
    triggerLogic: {
      kind: "cap",
      appliesTo: ["A4", "D1"],
      capValue: 5,
      capDimension: "score_contribution",
    },
    signalsAffected: ["A4", "D1"],
    action: "Score capped at <= 5 for this occurrence.",
    capValue: 5,
    isOverridable: false,
    rationale: "Reposts != original buying behavior. Require original posting account language.",
  },
  {
    ruleCode: "GR-04",
    name: "Moodboard cap",
    triggerCondition: "Pure inspiration/moodboard post with no product/category specificity",
    triggerLogic: {
      kind: "cap",
      appliesTo: ["A4"],
      capValue: 5,
      capDimension: "score_contribution",
    },
    signalsAffected: ["A4"],
    action: "Score capped at <= 5.",
    capValue: 5,
    isOverridable: false,
    rationale: "Moodboards do not signal buying intent or assortment change.",
  },
  {
    ruleCode: "GR-05",
    name: "Standalone D3 cap",
    triggerCondition: "D3 (stockout signal) appearing alone with no structural or vendor corroboration",
    triggerLogic: {
      kind: "cap",
      appliesTo: ["D3"],
      capValue: 10,
      capDimension: "total_contribution",
    },
    signalsAffected: ["D3"],
    action: "Total D3 contribution capped at 10 unless S or V also present.",
    capValue: 10,
    isOverridable: false,
    rationale: "Single stockout mention could be supply chain issue, not demand signal.",
  },
  {
    ruleCode: "GR-06",
    name: "Single source cap",
    triggerCondition: "Single source only — no second independent source detected",
    triggerLogic: {
      kind: "tier_cap",
      appliesTo: ["all"],
      tierCap: "CANDIDATE",
    },
    signalsAffected: ["all"],
    action: "CANDIDATE tier maximum. Cannot promote to VALIDATED.",
    capValue: null,
    isOverridable: false,
    rationale: "Single source = unconfirmed. Must see corroboration from independent source.",
  },
  {
    ruleCode: "GR-07",
    name: "Non-US routing block",
    triggerCondition: "Account geographic market is non-US (for US B2B routing)",
    triggerLogic: {
      kind: "block_route",
      appliesTo: ["all"],
      requires: { usOnly: true },
    },
    signalsAffected: ["all"],
    action: "Signal created but excluded from US B2B Machine routing.",
    capValue: null,
    isOverridable: true,
    rationale: "A non-US account is not a US wholesale signal.",
  },
  {
    ruleCode: "GR-08",
    name: "Unclassified account hold",
    triggerCondition: "Account archetype is UNKNOWN or unclassified",
    triggerLogic: {
      kind: "discard",
      appliesTo: ["all"],
      requires: { archetypeKnown: true },
    },
    signalsAffected: ["all"],
    action: "Signal record created but held pending taxonomy assignment.",
    capValue: null,
    isOverridable: true,
    rationale: "Unclassified account cannot be weighted. Taxonomy must come first.",
  },
  {
    ruleCode: "GR-09",
    name: "Low archetype confidence outreach block",
    triggerCondition: "Archetype confidence is LOW",
    triggerLogic: { kind: "block_route", appliesTo: ["all"] },
    signalsAffected: ["all"],
    action: "Signal detected but outreach agent cannot activate until confidence increases.",
    capValue: null,
    isOverridable: true,
    rationale: "Low-confidence archetype = uncertain program fit. Conservative approach required.",
  },
  {
    ruleCode: "GR-10",
    name: "Cooldown",
    triggerCondition: "Account within 21-day cooldown from last outreach",
    triggerLogic: {
      kind: "block_route",
      appliesTo: ["all"],
      requires: { cooldownActive: true },
    },
    signalsAffected: ["all"],
    action: "Signal detected and scored. Outreach blocked until cooldown expires.",
    capValue: null,
    isOverridable: true,
    rationale: "Prevents outreach fatigue and spam-rate trigger.",
  },
  {
    ruleCode: "GR-11",
    name: "Expired window zero",
    triggerCondition: "Signal is older than decay window (expired)",
    triggerLogic: {
      kind: "cap",
      appliesTo: ["all"],
      capValue: 0,
      capDimension: "score_contribution",
    },
    signalsAffected: ["all"],
    action: "Signal record remains but score_contribution = 0.",
    capValue: 0,
    isOverridable: false,
    rationale: "Expired signals cannot be revived. New event needed.",
  },
  {
    ruleCode: "GR-12",
    name: "Sub-60 V intent outreach block",
    triggerCondition: "Score below 60 for intent signal wanting to trigger outreach",
    triggerLogic: { kind: "block_route", appliesTo: ["V1", "V2", "V3"] },
    signalsAffected: ["V1", "V2", "V3"],
    action: "Outreach Commander cannot activate. Account enters warm queue.",
    capValue: null,
    isOverridable: false,
    rationale: "Protects against low-quality outreach. Minimum 60 for immediate activation.",
  },
  {
    ruleCode: "GR-13",
    name: "Trend over-occurrence",
    triggerCondition: "More than max_occurrences occurrences of same trend signal in window",
    triggerLogic: {
      kind: "cap",
      appliesTo: ["A4", "D1", "D2", "D3"],
      capValue: 0,
      capDimension: "score_contribution",
    },
    signalsAffected: ["A4", "D1", "D2", "D3"],
    action: "Additional occurrences do not contribute to score. Capped at max_occurrences.",
    capValue: 0,
    isOverridable: false,
    rationale: "Prevents one signal from dominating score. Forces multi-signal corroboration.",
  },
  {
    ruleCode: "GR-14",
    name: "Demand without velocity",
    triggerCondition: "D3 or D1 signal without Google Trends or TikTok velocity corroboration",
    triggerLogic: { kind: "tier_cap", appliesTo: ["D1", "D3"], tierCap: "CANDIDATE" },
    signalsAffected: ["D1", "D3"],
    action: "Confidence tier held at CANDIDATE. Cannot promote to VALIDATED.",
    capValue: null,
    isOverridable: false,
    rationale:
      "Demand signals require velocity layer to confirm trend is accelerating, not decaying.",
  },
];
