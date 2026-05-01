// Sheet 09 — Program Catalog. P-001..P-009.

export type ProgramDef = {
  programId: string;
  name: string;
  status: "PHASE_1_LIVE" | "DEVELOPMENT" | "DEPRECATED";
  targetArchetypes: string[];
  triggerSignals: string[];
  priceBand: string;
  moq: string;
  framing: string;
  riskStructure: string;
  notes: string;
};

export const PROGRAMS: ProgramDef[] = [
  {
    programId: "P-001",
    name: "Stackable Rings Program",
    status: "PHASE_1_LIVE",
    targetArchetypes: ["A1", "A2", "A7", "A10"],
    triggerSignals: ["S2", "A2", "A4"],
    priceBand: "$300–$1,500 retail",
    moq: "12 pcs per style",
    framing:
      "Help boutiques build stackable capsules that reorder quickly. Strong retail price bands. Fast turns.",
    riskStructure: "Try-and-reorder. First order no commitment beyond initial SKUs.",
    notes: "Highest volume program. Most universal fit.",
  },
  {
    programId: "P-002",
    name: "Everyday Essentials Line",
    status: "PHASE_1_LIVE",
    targetArchetypes: ["A1", "A2", "A6", "A9", "A10", "A11"],
    triggerSignals: ["A4", "D3", "V1"],
    priceBand: "$200–$800 retail",
    moq: "6 pcs per style",
    framing:
      "Year-round sellers. Low drama, high reorder. Everyday gold staples that fill case gaps.",
    riskStructure: "Consignment option for Tier 1 accounts. Open-buy for others.",
    notes: "Broadest fit. Entry point for most new accounts.",
  },
  {
    programId: "P-003",
    name: "Capsule Collection Launch",
    status: "PHASE_1_LIVE",
    targetArchetypes: ["A1", "A3", "A4", "A5", "A11"],
    triggerSignals: ["V2", "A1", "D2"],
    priceBand: "$400–$2,500 retail",
    moq: "24–60 pcs per capsule",
    framing:
      "Launch your own collection without the production complexity. Design-to-delivery partnership.",
    riskStructure: "Pre-order model. 50% deposit on approval.",
    notes: "ODM-adjacent. Higher touch. Longer lead time.",
  },
  {
    programId: "P-004",
    name: "Quick-Turn Core Reorder Program",
    status: "PHASE_1_LIVE",
    targetArchetypes: ["A2", "A4", "A12"],
    triggerSignals: ["D3", "S4"],
    priceBand: "$150–$600 retail",
    moq: "6 pcs per style",
    framing: "Fast replenishment for confirmed sellers. 4-6 week turnaround. No redesign needed.",
    riskStructure: "Reorder only. No samples. Proven SKU required.",
    notes: "Volume program. Low margin but high frequency.",
  },
  {
    programId: "P-005",
    name: "Men's Jewelry Capsule",
    status: "PHASE_1_LIVE",
    targetArchetypes: ["A8", "A1"],
    triggerSignals: ["A2", "A4"],
    priceBand: "$300–$2,000 retail",
    moq: "12 pcs per style",
    framing:
      "Capture the men's category before it matures. Signets, chains, cuffs — the winning trio.",
    riskStructure: "Try-3 SKUs first. Reorder gates open at 60% sell-through.",
    notes: "Emerging category. Early-mover advantage window open.",
  },
  {
    programId: "P-006",
    name: "Bridal Add-On Capsule",
    status: "PHASE_1_LIVE",
    targetArchetypes: ["A7"],
    triggerSignals: ["A2", "D1"],
    priceBand: "$800–$5,000 retail",
    moq: "6 pcs per style",
    framing:
      "Complement bridal with fashion pieces bridal customers want. No conflict with core bridal business.",
    riskStructure: "Consignment for first drop. Reorder on sell-through.",
    notes: "Bridal-to-fashion cross-sell. High AOV accounts.",
  },
  {
    programId: "P-007",
    name: "Programmatic Drop Capsules",
    status: "PHASE_1_LIVE",
    targetArchetypes: ["A12"],
    triggerSignals: ["V3", "A1"],
    priceBand: "$30–$300 retail",
    moq: "50–200 pcs per drop",
    framing: "Reliable production for subscription and curated drops. Consistent quality at drop volume.",
    riskStructure: "Per-drop purchase order. Net 30 terms.",
    notes: "Subscription model. Lower margin. Volume compensates.",
  },
  {
    programId: "P-008",
    name: "ODM Custom Program",
    status: "DEVELOPMENT",
    targetArchetypes: ["A3", "A5", "A9"],
    triggerSignals: ["V2", "D2"],
    priceBand: "$500–$10,000 retail",
    moq: "Custom per project",
    framing: "Full design-to-production custom program. Client's IP, our manufacturing.",
    riskStructure: "50% deposit on design approval. 50% on delivery.",
    notes: "Highest value. Longest cycle. Not in Phase-1 auto-suggest.",
  },
  {
    programId: "P-009",
    name: "Personalization / Birthstone Program",
    status: "DEVELOPMENT",
    targetArchetypes: ["A1", "A3", "A6"],
    triggerSignals: ["D2", "D1"],
    priceBand: "$200–$1,500 retail",
    moq: "TBD",
    framing: "Personalized jewelry programs with birthstone and engraving options.",
    riskStructure: "TBD",
    notes: "Consumer trend signal strong. Program in development.",
  },
];
