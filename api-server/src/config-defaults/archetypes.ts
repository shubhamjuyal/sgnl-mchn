// Sheet 07 — Account Taxonomy. 12 archetypes A1..A12.

export type ArchetypeDef = {
  code: string;
  name: string;
  description: string;
  followerRange: string;
  priceTier: string;
  topSignals: string[];
  primaryProgramId: string;
  secondaryProgramId: string;
  outreachChannelPriority: string;
  archetypeConfidenceLogic: string;
  geographicFilter: string;
  notes: string;
};

export const ARCHETYPES: ArchetypeDef[] = [
  {
    code: "A1",
    name: "Modern Independent Fashion Jeweler",
    description: "Style-forward boutique. Strong social presence. Trend-responsive assortment.",
    followerRange: "2k–20k",
    priceTier: "$300–$2,500",
    topSignals: ["S2", "A4", "V1"],
    primaryProgramId: "P-001",
    secondaryProgramId: "P-002",
    outreachChannelPriority: "Email → Instagram DM",
    archetypeConfidenceLogic:
      "High if Instagram active + price band confirmed. Medium if only website signal.",
    geographicFilter: "US — urban markets",
    notes: "Highest volume archetype. Largest opportunity pool.",
  },
  {
    code: "A2",
    name: "Regional Multi-Store Fine Jeweler",
    description: "Multiple locations. Established brand. Sophisticated buying process.",
    followerRange: "5k–50k",
    priceTier: "$1,000–$10,000",
    topSignals: ["S1", "S4", "A2"],
    primaryProgramId: "P-002",
    secondaryProgramId: "P-004",
    outreachChannelPriority: "Email → LinkedIn",
    archetypeConfidenceLogic:
      "High if multi-location confirmed + buyer role exists. Low for single-location.",
    geographicFilter: "US — regional markets",
    notes: "Longer sales cycle. Higher volume per order.",
  },
  {
    code: "A3",
    name: "Private Label / House Collection Developer",
    description: "Builds own branded line. Values exclusivity. ODM ideal fit.",
    followerRange: "1k–15k",
    priceTier: "$500–$5,000",
    topSignals: ["A1", "V2", "D2"],
    primaryProgramId: "P-003",
    secondaryProgramId: "P-008",
    outreachChannelPriority: "Email → Instagram DM",
    archetypeConfidenceLogic:
      "High if own-brand language in posts confirmed. Medium if mixed with other brands.",
    geographicFilter: "US",
    notes: "ODM is the primary pitch. Do not lead with catalog programs.",
  },
  {
    code: "A4",
    name: "Design-Driven DTC Brand",
    description: "Online-first. Own brand. Rapid SKU turnover. Scaling via social.",
    followerRange: "10k–200k",
    priceTier: "$200–$2,000",
    topSignals: ["D3", "A2", "S4"],
    primaryProgramId: "P-004",
    secondaryProgramId: "P-003",
    outreachChannelPriority: "Email → Instagram DM",
    archetypeConfidenceLogic: "High if DTC brand language confirmed + scaling signals present.",
    geographicFilter: "US — online-first",
    notes: "Scale-up brands. Reorder speed is key pitch point.",
  },
  {
    code: "A5",
    name: "Emerging Designer Without Factory",
    description: "Independent designer. No manufacturing. Seeking production partner.",
    followerRange: "500–10k",
    priceTier: "$300–$3,000",
    topSignals: ["V2", "D2", "S4"],
    primaryProgramId: "P-003",
    secondaryProgramId: "P-008",
    outreachChannelPriority: "Instagram DM → Email",
    archetypeConfidenceLogic:
      "Medium — emerging accounts have limited signal history. Verify manually.",
    geographicFilter: "US — any",
    notes: "High-value long-term relationship. Patience required in sales cycle.",
  },
  {
    code: "A6",
    name: "Creator-Led Jewelry Brand",
    description: "Influencer or content creator with own jewelry line. Audience-driven.",
    followerRange: "10k–500k",
    priceTier: "$100–$1,500",
    topSignals: ["V1", "A4", "D3"],
    primaryProgramId: "P-002",
    secondaryProgramId: "P-003",
    outreachChannelPriority: "Instagram DM → Email",
    archetypeConfidenceLogic:
      "High if creator with jewelry content confirmed + product launches visible.",
    geographicFilter: "US",
    notes: "Fast-moving. Short window. Respond within 48 hours of V1 signal.",
  },
  {
    code: "A7",
    name: "Bridal + Fashion Hybrid Retailer",
    description: "Primarily bridal. Expanding fashion. Layering and everyday category interest.",
    followerRange: "2k–30k",
    priceTier: "$500–$10,000",
    topSignals: ["A2", "D1"],
    primaryProgramId: "P-006",
    secondaryProgramId: "P-001",
    outreachChannelPriority: "Email → Instagram DM",
    archetypeConfidenceLogic: "High if bridal + fashion combo confirmed in product mix.",
    geographicFilter: "US — suburban + destination markets",
    notes: "Position as bridal complement, not replacement.",
  },
  {
    code: "A8",
    name: "Men's / Gender-Neutral Retailer",
    description: "Men's jewelry focus. Signets, chains, cuffs. Growing category.",
    followerRange: "1k–20k",
    priceTier: "$200–$3,000",
    topSignals: ["A2", "A4", "D1"],
    primaryProgramId: "P-005",
    secondaryProgramId: "P-002",
    outreachChannelPriority: "Email → Instagram DM",
    archetypeConfidenceLogic: "High if men's SKU category confirmed + promotion visible.",
    geographicFilter: "US",
    notes: "Emerging category. Early-mover advantage. Lead with Men's Capsule.",
  },
  {
    code: "A9",
    name: "Luxury Private Jeweler",
    description: "High-end. Custom work primary. Seeking repeatable designs for everyday inventory.",
    followerRange: "500–10k",
    priceTier: "$5,000+",
    topSignals: ["S3", "V1", "D2"],
    primaryProgramId: "P-002",
    secondaryProgramId: "P-008",
    outreachChannelPriority: "Email (formal) → Phone",
    archetypeConfidenceLogic:
      "Low default — luxury accounts require manual verification. High only post-meeting.",
    geographicFilter: "US — luxury markets",
    notes: "Longest sales cycle. Highest AOV. Relationship-first approach.",
  },
  {
    code: "A10",
    name: "Legacy Independent in Transition",
    description: "Established store. Ownership change or renovation. Open to new vendor review.",
    followerRange: "1k–15k",
    priceTier: "$500–$8,000",
    topSignals: ["S3", "S2", "V1"],
    primaryProgramId: "P-002",
    secondaryProgramId: "P-001",
    outreachChannelPriority: "Email → Phone",
    archetypeConfidenceLogic:
      "Medium — transition signals strong but archetype may shift post-change.",
    geographicFilter: "US",
    notes: "Best window: within 90 days of transition event. Act fast.",
  },
  {
    code: "A11",
    name: "Lifestyle / Concept Store with Jewelry Section",
    description: "Non-jewelry primary. Jewelry as gift/lifestyle category. Growing assortment.",
    followerRange: "2k–50k",
    priceTier: "$100–$1,500",
    topSignals: ["A2", "D1", "A4"],
    primaryProgramId: "P-003",
    secondaryProgramId: "P-002",
    outreachChannelPriority: "Email → Instagram DM",
    archetypeConfidenceLogic: "Low until jewelry becomes confirmed primary category. Monitor.",
    geographicFilter: "US — urban/lifestyle markets",
    notes: "Gift-focused assortment. Margin matters. Low MOQ programs preferred.",
  },
  {
    code: "A12",
    name: "Subscription / Curated Box Platform",
    description: "Subscription jewelry drops. Curator model. Reliable volume but lower margin.",
    followerRange: "5k–100k",
    priceTier: "$30–$300",
    topSignals: ["V3", "A1", "D3"],
    primaryProgramId: "P-007",
    secondaryProgramId: "P-004",
    outreachChannelPriority: "Email (B2B procurement)",
    archetypeConfidenceLogic: "High if subscription model confirmed + jewelry category primary.",
    geographicFilter: "US — online only",
    notes:
      "Volume-driven. Consistent production schedule required. Different pitch from boutiques.",
  },
];
