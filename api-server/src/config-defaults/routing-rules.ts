// Sheet 10 — Routing Logic. CONFIRMED signals route to downstream systems.
// Lower priority = evaluated first.

export type RoutingRuleDef = {
  priority: number;
  name: string;
  matchTier: "CANDIDATE" | "VALIDATED" | "CONFIRMED" | "EXPIRED";
  matchSignalCategory: "trend" | "intent" | "any" | null;
  matchSignalCodes: string[] | null;
  scoreMin: number | null;
  scoreMax: number | null;
  destination:
    | "monitor_queue"
    | "b2b_watch_queue"
    | "b2b_warm_queue"
    | "b2b_outreach_queue"
    | "design_whisperer"
    | "phantom_testing";
  humanGateRequired: boolean;
  slaHours: number | null;
  notes: string;
};

export const ROUTING_RULES: RoutingRuleDef[] = [
  {
    priority: 10,
    name: "CONFIRMED trend → Design Whisperer",
    matchTier: "CONFIRMED",
    matchSignalCategory: "trend",
    matchSignalCodes: null,
    scoreMin: null,
    scoreMax: null,
    destination: "design_whisperer",
    humanGateRequired: true,
    slaHours: 48,
    notes: "Stubbed in MVP — logged only.",
  },
  {
    priority: 20,
    name: "CONFIRMED trend → Phantom Testing",
    matchTier: "CONFIRMED",
    matchSignalCategory: "trend",
    matchSignalCodes: null,
    scoreMin: null,
    scoreMax: null,
    destination: "phantom_testing",
    humanGateRequired: true,
    slaHours: 72,
    notes: "Stubbed in MVP — logged only.",
  },
  {
    priority: 30,
    name: "CONFIRMED V-cluster ≥60 → B2B Outreach",
    matchTier: "CONFIRMED",
    matchSignalCategory: "intent",
    matchSignalCodes: ["V1", "V2", "V3"],
    scoreMin: 60,
    scoreMax: null,
    destination: "b2b_outreach_queue",
    humanGateRequired: true,
    slaHours: 24,
    notes: "Outreach Commander — draft created, never auto-sent.",
  },
  {
    priority: 40,
    name: "CONFIRMED intent 40-59 → Warm Queue",
    matchTier: "CONFIRMED",
    matchSignalCategory: "intent",
    matchSignalCodes: null,
    scoreMin: 40,
    scoreMax: 59,
    destination: "b2b_warm_queue",
    humanGateRequired: true,
    slaHours: 24 * 7,
    notes: "Weekly batch review.",
  },
  {
    priority: 50,
    name: "VALIDATED any → Watch Queue",
    matchTier: "VALIDATED",
    matchSignalCategory: "any",
    matchSignalCodes: null,
    scoreMin: null,
    scoreMax: null,
    destination: "b2b_watch_queue",
    humanGateRequired: true,
    slaHours: 24 * 5,
    notes: "Interesting but unconfirmed.",
  },
  {
    priority: 90,
    name: "CANDIDATE any → Monitor",
    matchTier: "CANDIDATE",
    matchSignalCategory: "any",
    matchSignalCodes: null,
    scoreMin: null,
    scoreMax: null,
    destination: "monitor_queue",
    humanGateRequired: false,
    slaHours: null,
    notes: "Watching for second source.",
  },
];
