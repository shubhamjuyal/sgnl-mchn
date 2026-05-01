// Sheet 08 — Archetype × Top Signals × Programs.

export type MappingDef = {
  archetypeCode: string;
  signalCode: string;
  primaryProgramId: string;
  secondaryProgramId: string;
  minScoreForOutreach: number;
  cooldownDays: number;
  salesFraming: string;
  channel: string;
  urgencyLevel: string;
};

export const ARCHETYPE_PROGRAM_MAPPING: MappingDef[] = [
  // A1
  ...["S2", "A1", "V1", "A4"].map((code) => ({
    archetypeCode: "A1",
    signalCode: code,
    primaryProgramId: "P-001",
    secondaryProgramId: "P-002",
    minScoreForOutreach: 40,
    cooldownDays: 21,
    salesFraming:
      "Help boutiques build stackable or everyday capsules that reorder quickly within strong retail price bands.",
    channel: "Email → Instagram DM",
    urgencyLevel: "HIGH",
  })),
  // A2
  ...["S1", "S4", "A2"].map((code) => ({
    archetypeCode: "A2",
    signalCode: code,
    primaryProgramId: "P-002",
    secondaryProgramId: "P-004",
    minScoreForOutreach: 50,
    cooldownDays: 21,
    salesFraming:
      "Provide scalable jewelry programs that perform consistently across multiple locations without case-by-case ordering.",
    channel: "Email → LinkedIn",
    urgencyLevel: "MEDIUM",
  })),
  // A3
  ...["A1", "V2", "D2"].map((code) => ({
    archetypeCode: "A3",
    signalCode: code,
    primaryProgramId: "P-003",
    secondaryProgramId: "P-008",
    minScoreForOutreach: 40,
    cooldownDays: 21,
    salesFraming:
      "Partner with retailers building proprietary collections. Full design-to-delivery capability.",
    channel: "Email → Instagram DM",
    urgencyLevel: "HIGH",
  })),
  // A4
  ...["D3", "A2", "S4"].map((code) => ({
    archetypeCode: "A4",
    signalCode: code,
    primaryProgramId: "P-004",
    secondaryProgramId: "P-003",
    minScoreForOutreach: 40,
    cooldownDays: 21,
    salesFraming:
      "Support scaling brands with reliable manufacturing and restock capacity. Speed is the pitch.",
    channel: "Email → Instagram DM",
    urgencyLevel: "HIGH",
  })),
  // A5
  ...["V2", "D2", "S4"].map((code) => ({
    archetypeCode: "A5",
    signalCode: code,
    primaryProgramId: "P-003",
    secondaryProgramId: "P-008",
    minScoreForOutreach: 40,
    cooldownDays: 21,
    salesFraming:
      "Translate signature designs into scalable production. First production run = first partnership.",
    channel: "Instagram DM → Email",
    urgencyLevel: "HIGH",
  })),
  // A6
  ...["V1", "A4", "D3"].map((code) => ({
    archetypeCode: "A6",
    signalCode: code,
    primaryProgramId: "P-002",
    secondaryProgramId: "P-003",
    minScoreForOutreach: 40,
    cooldownDays: 21,
    salesFraming:
      "Turn audience demand into structured capsule collections. We fulfill what your audience already wants.",
    channel: "Instagram DM → Email",
    urgencyLevel: "URGENT",
  })),
  // A7
  ...["A2", "D1", "A4"].map((code) => ({
    archetypeCode: "A7",
    signalCode: code,
    primaryProgramId: "P-006",
    secondaryProgramId: "P-001",
    minScoreForOutreach: 40,
    cooldownDays: 21,
    salesFraming:
      "Introduce fashion programs that complement bridal purchases without displacing the core bridal business.",
    channel: "Email → Instagram DM",
    urgencyLevel: "MEDIUM",
  })),
  // A8
  ...["A2", "A4", "D1"].map((code) => ({
    archetypeCode: "A8",
    signalCode: code,
    primaryProgramId: "P-005",
    secondaryProgramId: "P-002",
    minScoreForOutreach: 40,
    cooldownDays: 21,
    salesFraming:
      "Capture the men's category before it matures. Signets, chains, cuffs — tested programs, fast reorder.",
    channel: "Email → Instagram DM",
    urgencyLevel: "HIGH",
  })),
  // A9
  ...["S3", "V1", "D2"].map((code) => ({
    archetypeCode: "A9",
    signalCode: code,
    primaryProgramId: "P-002",
    secondaryProgramId: "P-008",
    minScoreForOutreach: 60,
    cooldownDays: 21,
    salesFraming:
      "Provide a repeatable everyday inventory that complements custom work without cannibalizing it.",
    channel: "Email (formal) → Phone",
    urgencyLevel: "LOW",
  })),
  // A10
  ...["S3", "S2", "V1"].map((code) => ({
    archetypeCode: "A10",
    signalCode: code,
    primaryProgramId: "P-002",
    secondaryProgramId: "P-001",
    minScoreForOutreach: 40,
    cooldownDays: 21,
    salesFraming:
      "Fresh start, fresh assortment. Transition period = best window for new vendor introduction.",
    channel: "Email → Phone",
    urgencyLevel: "URGENT",
  })),
  // A11
  ...["A2", "D1", "A4"].map((code) => ({
    archetypeCode: "A11",
    signalCode: code,
    primaryProgramId: "P-003",
    secondaryProgramId: "P-002",
    minScoreForOutreach: 40,
    cooldownDays: 21,
    salesFraming:
      "Create gift-friendly jewelry capsules aligned with the store's lifestyle aesthetic. Low MOQ, high margin.",
    channel: "Email → Instagram DM",
    urgencyLevel: "MEDIUM",
  })),
  // A12
  ...["V3", "A1", "D3"].map((code) => ({
    archetypeCode: "A12",
    signalCode: code,
    primaryProgramId: "P-007",
    secondaryProgramId: "P-004",
    minScoreForOutreach: 40,
    cooldownDays: 21,
    salesFraming:
      "Provide reliable production for curated drops on a subscription schedule. Consistency is the product.",
    channel: "Email (procurement)",
    urgencyLevel: "MEDIUM",
  })),
];
