// Sheet 01 — Signal Sources. MVP scopes to Instagram + Websites + Manual.

export type SourceDef = {
  sourceName: string;
  collectionMethod: string;
  targetScope: Record<string, unknown>;
  geographicFilter: string;
  accountQualityFilter: Record<string, unknown>;
  updateFrequency: string;
  signalJustification: string;
  limitations: string;
  status: "ACTIVE" | "PARTIAL" | "PENDING" | "DISABLED";
  cronExpression: string | null;
};

export const SOURCES: SourceDef[] = [
  {
    sourceName: "instagram",
    collectionMethod: "apify",
    targetScope: {
      kind: "account_based",
      handlesFrom: "account.handles.instagram",
      hashtags: [],
    },
    geographicFilter: "US",
    accountQualityFilter: { minFollowers: 1000, priceTierMin: 300 },
    updateFrequency: "weekly",
    signalJustification:
      "Visual trend proof — what vetted accounts are posting. Corroborates other sources.",
    limitations: "Cannot show search intent. Engagement can be gamed. No purchase confirmation.",
    status: "PENDING", // turn ACTIVE once Apify token configured
    cronExpression: "0 4 * * 1", // Monday 04:00
  },
  {
    sourceName: "website",
    collectionMethod: "playwright",
    targetScope: { kind: "diff_per_account", basePath: "/" },
    geographicFilter: "US",
    accountQualityFilter: { hasWebsite: true },
    updateFrequency: "biweekly",
    signalJustification:
      "Detects website_category_change (A3) and product additions/removals. Visible before social posts.",
    limitations: "JS-rendered sites need careful selectors. Some sites block headless.",
    status: "PARTIAL",
    cronExpression: "0 5 */14 * *",
  },
  {
    sourceName: "manual",
    collectionMethod: "manual",
    targetScope: { kind: "human_input" },
    geographicFilter: "US",
    accountQualityFilter: {},
    updateFrequency: "manual",
    signalJustification:
      "Human-collected signals. Validates dictionary, generates labeled data, fills coverage gaps.",
    limitations: "Throughput limited by human capacity.",
    status: "ACTIVE",
    cronExpression: null,
  },
];
