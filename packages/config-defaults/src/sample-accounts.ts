// A handful of fake retailer accounts so the seeded system has something to operate on.
// Real accounts come in via /accounts CSV import.

export type SampleAccount = {
  displayName: string;
  archetype: string;
  followerTier: number;
  geographicMarket: "US" | "EU" | "GULF" | "APAC";
  priceSegment: string;
  handles: { instagram?: string; website?: string };
  canonicalUrl?: string;
};

export const SAMPLE_ACCOUNTS: SampleAccount[] = [
  {
    displayName: "Catbird NYC",
    archetype: "A1",
    followerTier: 1,
    geographicMarket: "US",
    priceSegment: "$300-$2500",
    handles: { instagram: "catbirdnyc", website: "catbirdnyc.com" },
    canonicalUrl: "https://www.catbirdnyc.com",
  },
  {
    displayName: "Mejuri",
    archetype: "A4",
    followerTier: 1,
    geographicMarket: "US",
    priceSegment: "$200-$2000",
    handles: { instagram: "mejuri", website: "mejuri.com" },
    canonicalUrl: "https://mejuri.com",
  },
  {
    displayName: "Ana Luisa",
    archetype: "A4",
    followerTier: 2,
    geographicMarket: "US",
    priceSegment: "$100-$500",
    handles: { instagram: "analuisany", website: "analuisany.com" },
    canonicalUrl: "https://analuisany.com",
  },
];
