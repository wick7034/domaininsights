import type { SupabaseClient } from "@supabase/supabase-js";

type RpcStatRow = {
  name: string | null;
  value: number | string | null;
};

type RisingKeywordRow = {
  name: string | null;
  current_value: number | string | null;
  previous_value: number | string | null;
  growth_pct: number | string | null;
};

type QualityStatsRow = {
  brandable_count: number | string | null;
  has_numbers_count: number | string | null;
  has_hyphen_count: number | string | null;
  total_count: number | string | null;
};

type HeatmapCellRow = {
  keyword: string | null;
  tld: string | null;
  value: number | string | null;
};

export type AnalyticsStat = {
  name: string;
  value: number;
};

export type RisingKeyword = {
  name: string;
  currentValue: number;
  previousValue: number;
  growthPercent: number;
};

export type QualityBreakdownItem = {
  name: "brandable" | "hasNumbers" | "hasHyphen";
  label: string;
  value: number;
  percentage: number;
};

export type HeatmapRow = {
  keyword: string;
  counts: Record<string, number>;
};

export type HeatmapData = {
  keywords: string[];
  tlds: string[];
  rows: HeatmapRow[];
};

export type DomainIntelligenceData = {
  trendingKeywords: AnalyticsStat[];
  risingKeywords: RisingKeyword[];
  tldDistribution: AnalyticsStat[];
  lengthBuckets: AnalyticsStat[];
  qualityStats: QualityBreakdownItem[];
  heatmap: HeatmapData;
  hotToday: {
    topKeywords: AnalyticsStat[];
    topTld: AnalyticsStat | null;
    href: string;
  };
};

type AnalyticsClient = SupabaseClient<any, any, any>;

const EMPTY_HEATMAP: HeatmapData = {
  keywords: [],
  tlds: [],
  rows: [],
};

const PINNED_HEATMAP_TLDS = ["ai", "io"];

export const EMPTY_DOMAIN_INTELLIGENCE: DomainIntelligenceData = {
  trendingKeywords: [],
  risingKeywords: [],
  tldDistribution: [],
  lengthBuckets: [],
  qualityStats: [],
  heatmap: EMPTY_HEATMAP,
  hotToday: {
    topKeywords: [],
    topTld: null,
    href: "/",
  },
};

function normalizeCount(value: number | string | null | undefined) {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(String(value ?? 0));
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeRpcStats(rows: RpcStatRow[] | null | undefined, fallbackName = "unknown") {
  return (rows || [])
    .map((row) => ({
      name: row.name?.trim() || fallbackName,
      value: normalizeCount(row.value),
    }))
    .filter((row) => row.name && row.value > 0);
}

async function callRpc<T>(
  supabase: AnalyticsClient,
  functionName: string,
  args: Record<string, unknown>,
) {
  const { data, error } = await (supabase as any).rpc(functionName, args);

  if (error) {
    throw error;
  }

  return (data || []) as T[];
}

function getDateString(date: Date) {
  return date.toISOString().split("T")[0];
}

function subtractDays(baseDate: Date, days: number) {
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() - days);
  return nextDate;
}

export function buildExploreHref(keyword?: string, tld?: string) {
  const params = new URLSearchParams();
  params.set("view", "explore");

  if (keyword) {
    params.set("keywords", keyword);
  }

  if (tld) {
    params.set("tlds", tld);
  }

  const queryString = params.toString();
  return queryString ? `/?${queryString}` : "/";
}

export async function getTopKeywords(
  supabase: AnalyticsClient,
  {
    dateThreshold,
    filterTld = null,
    maxRows = 20,
  }: {
    dateThreshold: string;
    filterTld?: string | null;
    maxRows?: number;
  },
) {
  const rows = await callRpc<RpcStatRow>(supabase, "get_top_keywords", {
    date_threshold: dateThreshold,
    filter_tld: filterTld,
    max_rows: maxRows,
  });

  return normalizeRpcStats(rows, "unknown");
}

export async function getTldDistribution(
  supabase: AnalyticsClient,
  {
    dateThreshold,
    filterTld = null,
    maxRows = 10,
  }: {
    dateThreshold: string;
    filterTld?: string | null;
    maxRows?: number;
  },
) {
  const rows = await callRpc<RpcStatRow>(supabase, "get_top_tlds", {
    date_threshold: dateThreshold,
    filter_tld: filterTld,
    max_rows: maxRows,
  });

  return normalizeRpcStats(rows, "unknown");
}

export async function getRisingKeywords(
  supabase: AnalyticsClient,
  {
    currentDateThreshold,
    previousDateThreshold,
    maxRows = 5,
  }: {
    currentDateThreshold: string;
    previousDateThreshold: string;
    maxRows?: number;
  },
) {
  const rows = await callRpc<RisingKeywordRow>(supabase, "get_rising_keywords", {
    current_date_threshold: currentDateThreshold,
    previous_date_threshold: previousDateThreshold,
    max_rows: maxRows,
  });

  return rows
    .map((row) => ({
      name: row.name?.trim() || "unknown",
      currentValue: normalizeCount(row.current_value),
      previousValue: normalizeCount(row.previous_value),
      growthPercent: normalizeCount(row.growth_pct),
    }))
    .filter((row) => row.name && row.currentValue > 0)
    .sort((a, b) => b.growthPercent - a.growthPercent)
    .slice(0, maxRows);
}

export async function getLengthBuckets(
  supabase: AnalyticsClient,
  {
    dateThreshold,
  }: {
    dateThreshold: string;
  },
) {
  const rows = await callRpc<RpcStatRow>(supabase, "get_length_buckets", {
    date_threshold: dateThreshold,
  });

  const order = ["1-5", "6-10", "11-15", "15+"];
  return normalizeRpcStats(rows)
    .sort((left, right) => order.indexOf(left.name) - order.indexOf(right.name));
}

export async function getQualityStats(
  supabase: AnalyticsClient,
  {
    dateThreshold,
  }: {
    dateThreshold: string;
  },
) {
  const rows = await callRpc<QualityStatsRow>(supabase, "get_quality_stats", {
    date_threshold: dateThreshold,
  });

  const row = rows[0];
  if (!row) {
    return [];
  }

  const totalCount = normalizeCount(row.total_count);
  if (totalCount <= 0) {
    return [];
  }

  const stats: QualityBreakdownItem[] = [
    {
      name: "brandable",
      label: "Brandable",
      value: normalizeCount(row.brandable_count),
      percentage: 0,
    },
    {
      name: "hasNumbers",
      label: "Has Numbers",
      value: normalizeCount(row.has_numbers_count),
      percentage: 0,
    },
    {
      name: "hasHyphen",
      label: "Has Hyphen",
      value: normalizeCount(row.has_hyphen_count),
      percentage: 0,
    },
  ];

  return stats.map((stat) => ({
    ...stat,
    percentage: Number(((stat.value / totalCount) * 100).toFixed(1)),
  }));
}

export async function getHeatmapData(
  supabase: AnalyticsClient,
  {
    dateThreshold,
    keywordLimit = 20,
    tldLimit = 5,
  }: {
    dateThreshold: string;
    keywordLimit?: number;
    tldLimit?: number;
  },
) {
  const rows = await callRpc<HeatmapCellRow>(supabase, "get_keyword_tld_heatmap", {
    date_threshold: dateThreshold,
    keyword_limit: keywordLimit,
    tld_limit: tldLimit,
  });

  if (rows.length === 0) {
    return EMPTY_HEATMAP;
  }

  const keywords = Array.from(
    new Set(rows.map((row) => row.keyword?.trim()).filter(Boolean)),
  ) as string[];
  const discoveredTlds = Array.from(
    new Set(rows.map((row) => row.tld?.trim().toLowerCase()).filter(Boolean)),
  ) as string[];
  const tlds = [
    ...PINNED_HEATMAP_TLDS.filter((tld) => discoveredTlds.includes(tld)),
    ...discoveredTlds.filter((tld) => !PINNED_HEATMAP_TLDS.includes(tld)),
  ];

  const rowMap = new Map<string, HeatmapRow>();

  for (const keyword of keywords) {
    rowMap.set(keyword, {
      keyword,
      counts: Object.fromEntries(tlds.map((tld) => [tld, 0])),
    });
  }

  for (const cell of rows) {
    const keyword = cell.keyword?.trim();
    const tld = cell.tld?.trim();
    if (!keyword || !tld) {
      continue;
    }

    const row = rowMap.get(keyword);
    if (!row) {
      continue;
    }

    row.counts[tld] = normalizeCount(cell.value);
  }

  return {
    keywords,
    tlds,
    rows: keywords
      .map((keyword) => rowMap.get(keyword))
      .filter(Boolean) as HeatmapRow[],
  };
}

export async function getDomainIntelligenceData(
  supabase: AnalyticsClient,
  {
    dateThreshold,
  }: {
    dateThreshold: string;
  },
): Promise<DomainIntelligenceData> {
  const today = new Date();
  const todayThreshold = getDateString(today);
  const yesterdayThreshold = getDateString(subtractDays(today, 1));

  const [
    trendingKeywordsResult,
    risingKeywordsResult,
    tldDistributionResult,
    lengthBucketsResult,
    qualityStatsResult,
    heatmapResult,
    hotKeywordsResult,
    hotTldResult,
  ] = await Promise.allSettled([
    getTopKeywords(supabase, { dateThreshold, maxRows: 20 }),
    getRisingKeywords(supabase, {
      currentDateThreshold: todayThreshold,
      previousDateThreshold: yesterdayThreshold,
      maxRows: 5,
    }),
    getTldDistribution(supabase, { dateThreshold, maxRows: 10 }),
    getLengthBuckets(supabase, { dateThreshold }),
    getQualityStats(supabase, { dateThreshold }),
    getHeatmapData(supabase, { dateThreshold, keywordLimit: 20, tldLimit: 5 }),
    getTopKeywords(supabase, { dateThreshold: todayThreshold, maxRows: 5 }),
    getTldDistribution(supabase, { dateThreshold: todayThreshold, maxRows: 1 }),
  ]);

  const trendingKeywords =
    trendingKeywordsResult.status === "fulfilled" ? trendingKeywordsResult.value : [];
  const risingKeywords =
    risingKeywordsResult.status === "fulfilled" ? risingKeywordsResult.value : [];
  const tldDistribution =
    tldDistributionResult.status === "fulfilled" ? tldDistributionResult.value : [];
  const lengthBuckets =
    lengthBucketsResult.status === "fulfilled" ? lengthBucketsResult.value : [];
  const qualityStats =
    qualityStatsResult.status === "fulfilled" ? qualityStatsResult.value : [];
  const heatmap =
    heatmapResult.status === "fulfilled" ? heatmapResult.value : EMPTY_HEATMAP;
  const hotKeywords =
    hotKeywordsResult.status === "fulfilled" ? hotKeywordsResult.value : [];
  const hotTld =
    hotTldResult.status === "fulfilled" ? hotTldResult.value[0] || null : null;

  const ctaKeyword = hotKeywords[0]?.name;
  const ctaTld = hotTld?.name;

  return {
    trendingKeywords,
    risingKeywords,
    tldDistribution,
    lengthBuckets,
    qualityStats,
    heatmap,
    hotToday: {
      topKeywords: hotKeywords,
      topTld: hotTld,
      href: buildExploreHref(ctaKeyword, ctaTld),
    },
  };
}
