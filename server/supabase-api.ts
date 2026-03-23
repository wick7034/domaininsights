import { createClient } from "@supabase/supabase-js";
import {
  EMPTY_DOMAIN_INTELLIGENCE,
  getDomainIntelligenceData,
  getTldDistribution,
  getTopKeywords,
  type AnalyticsStat,
  type DomainIntelligenceData,
} from "../lib/analytics";

export type ApiResponse = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

type DomainTldRow = {
  tld: string | null;
};

type AnalyticsResponseBody = {
  totalCount: number;
  tldStats: AnalyticsStat[];
  keywordStats: AnalyticsStat[];
  intelligence: DomainIntelligenceData;
};

let supabaseClient: ReturnType<typeof createClient> | null = null;
const dataCache = new Map<string, { expiresAt: number; value: unknown }>();
const inFlightData = new Map<string, Promise<unknown>>();

const TLD_CACHE_TTL_MS = 60 * 60 * 1000;
const ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000;
const API_BROWSER_CACHE_SECONDS = 60;
const ANALYTICS_CACHE_VERSION = "v2";

function sanitizeEnvValue(value?: string) {
  if (!value) return "";

  const trimmedValue = value.trim();
  if (
    trimmedValue.length >= 2 &&
    ((trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
      (trimmedValue.startsWith("'") && trimmedValue.endsWith("'")))
  ) {
    return trimmedValue.slice(1, -1).trim();
  }

  return trimmedValue;
}

function getFirstEnvValue(keys: string[]) {
  for (const key of keys) {
    const value = sanitizeEnvValue(process.env[key]);
    if (value) {
      return value;
    }
  }

  return "";
}

function getSupabaseClient() {
  const supabaseUrl = getFirstEnvValue([
    "SUPABASE_URL",
    "VITE_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
  ]);
  const supabaseAnonKey = getFirstEnvValue([
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ]);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_ANON_KEY in the deployment settings, and do not wrap dashboard values in quotes.",
    );
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseClient;
}

export function toSearchParams(query: Record<string, unknown> = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item != null) {
          params.append(key, String(item));
        }
      }
      continue;
    }

    params.set(key, String(value));
  }

  return params;
}

function getStringParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim();
  return value ? value : undefined;
}

function getNumberParam(params: URLSearchParams, key: string, fallback: number) {
  const rawValue = params.get(key);
  if (rawValue == null || rawValue.trim() === "") {
    return fallback;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown server error";
}

function handleServerError(error: unknown): ApiResponse {
  console.error("[API] Request failed:", error);
  return {
    status: 500,
    body: { error: getErrorMessage(error) },
  };
}

function createSuccessResponse(body: unknown, sharedCacheSeconds?: number): ApiResponse {
  return {
    status: 200,
    body,
    headers:
      sharedCacheSeconds && sharedCacheSeconds > 0
        ? {
            "Cache-Control": `public, max-age=${API_BROWSER_CACHE_SECONDS}, s-maxage=${sharedCacheSeconds}, stale-while-revalidate=${sharedCacheSeconds}`,
          }
        : undefined,
  };
}

function getCachedData<T>(key: string) {
  const cachedEntry = dataCache.get(key);

  if (!cachedEntry) {
    return undefined;
  }

  if (cachedEntry.expiresAt <= Date.now()) {
    dataCache.delete(key);
    return undefined;
  }

  return cachedEntry.value as T;
}

async function loadCachedData<T>(key: string, ttlMs: number, loader: () => Promise<T>) {
  const cachedValue = getCachedData<T>(key);
  if (cachedValue !== undefined) {
    return cachedValue;
  }

  const inFlightValue = inFlightData.get(key);
  if (inFlightValue) {
    return (await inFlightValue) as T;
  }

  const promise = loader()
    .then((value) => {
      dataCache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      return value;
    })
    .finally(() => {
      inFlightData.delete(key);
    });

  inFlightData.set(key, promise as Promise<unknown>);
  return promise;
}

function normalizeSortBy(sortBy?: string) {
  const allowedSortFields = new Set(["created_at", "domain", "length"]);
  return sortBy && allowedSortFields.has(sortBy) ? sortBy : "created_at";
}

function normalizeSortOrder(sortOrder?: string) {
  return sortOrder === "asc" ? "asc" : "desc";
}

function normalizePeriod(period?: string) {
  if (period === "1d" || period === "30d") {
    return period;
  }

  return "7d";
}

function getPeriodDays(period: string) {
  if (period === "1d") return 1;
  if (period === "30d") return 30;
  return 7;
}

function normalizeTldValue(value: string | null) {
  if (!value) return "";

  let normalizedValue = value.trim().toLowerCase();
  if (normalizedValue.startsWith(".")) {
    normalizedValue = normalizedValue.slice(1);
  }

  return normalizedValue;
}

async function getGlobalAnalyticsCount(supabase: ReturnType<typeof createClient>, dateStr: string) {
  let query = supabase.from("domains").select("*", { count: "exact", head: true });
  query = query.gte("created_at", dateStr);

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count || 0;
}

async function computeGlobalAnalytics(
  supabase: ReturnType<typeof createClient>,
  period: string,
  dateStr: string,
) {
  return loadCachedData<AnalyticsResponseBody>(
    `analytics:global:${ANALYTICS_CACHE_VERSION}:${period}`,
    ANALYTICS_CACHE_TTL_MS,
    async () => {
      const [totalCount, tldStats, keywordStats, intelligence] = await Promise.all([
        getGlobalAnalyticsCount(supabase, dateStr),
        getTldDistribution(supabase, { dateThreshold: dateStr, maxRows: 10 }),
        getTopKeywords(supabase, { dateThreshold: dateStr, maxRows: 20 }),
        getDomainIntelligenceData(supabase, { dateThreshold: dateStr }).catch((error) => {
          console.error("[Analytics] Optional intelligence queries failed:", error);
          return EMPTY_DOMAIN_INTELLIGENCE;
        }),
      ]);

      return {
        totalCount,
        tldStats,
        keywordStats,
        intelligence,
      };
    },
  );
}

async function computeFilteredKeywordStats(
  supabase: ReturnType<typeof createClient>,
  period: string,
  dateStr: string,
  filterTld: string,
) {
  return loadCachedData<AnalyticsStat[]>(
    `analytics:keywords:${ANALYTICS_CACHE_VERSION}:${period}:${filterTld}`,
    ANALYTICS_CACHE_TTL_MS,
    () => getTopKeywords(supabase, { dateThreshold: dateStr, filterTld, maxRows: 20 }),
  );
}

export async function getDomainsResponse(params: URLSearchParams): Promise<ApiResponse> {
  try {
    const supabase = getSupabaseClient();
    const page = Math.max(0, getNumberParam(params, "page", 0));
    const limit = Math.max(1, getNumberParam(params, "limit", 100));
    const tlds = getStringParam(params, "tlds");
    const minLength = params.get("minLength");
    const maxLength = params.get("maxLength");
    const numbers = getStringParam(params, "numbers");
    const hyphens = getStringParam(params, "hyphens");
    const keywords = getStringParam(params, "keywords");
    const startsWith = getStringParam(params, "startsWith");
    const endsWith = getStringParam(params, "endsWith");
    const sortBy = normalizeSortBy(getStringParam(params, "sortBy"));
    const sortOrder = normalizeSortOrder(getStringParam(params, "sortOrder"));

    let query = supabase.from("domains").select("*", { count: "exact" });

    if (tlds) {
      const tldList = tlds
        .split(",")
        .map((tld) => tld.trim().toLowerCase())
        .filter(Boolean);
      const expandedTldList: string[] = [];

      for (const tld of tldList) {
        const tldWithoutDot = tld.startsWith(".") ? tld.slice(1) : tld;
        const tldWithDot = `.${tldWithoutDot}`;
        expandedTldList.push(tldWithoutDot, tldWithDot);
      }

      if (expandedTldList.length > 0) {
        query = query.in("tld", expandedTldList);
      }
    }

    if (minLength) {
      query = query.gte("length", parseInt(minLength, 10));
    }

    if (maxLength) {
      query = query.lte("length", parseInt(maxLength, 10));
    }

    if (numbers === "none") query = query.eq("has_numbers", false);
    if (numbers === "only") query = query.eq("is_number_only", true);
    if (numbers === "contains") query = query.eq("has_numbers", true);

    if (hyphens === "exclude") {
      query = query.eq("has_hyphen", false);
    }

    if (keywords) {
      const keywordList = keywords
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean);

      if (keywordList.length > 0) {
        query = query.contains("keywords", keywordList);
      }
    }

    if (startsWith) query = query.ilike("name", `${startsWith}%`);
    if (endsWith) query = query.ilike("name", `%${endsWith}`);

    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(page * limit, (page + 1) * limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return createSuccessResponse({ data, count });
  } catch (error) {
    return handleServerError(error);
  }
}

export async function getTldsResponse(): Promise<ApiResponse> {
  try {
    const supabase = getSupabaseClient();
    const tlds = await loadCachedData<string[]>("tlds:list", TLD_CACHE_TTL_MS, async () => {
      const { data, error } = await supabase.from("domains").select("tld").limit(1000000);

      if (error) {
        throw error;
      }

      const rows = (data || []) as DomainTldRow[];
      const tldSet = new Set<string>();

      for (const item of rows) {
        const normalizedTld = normalizeTldValue(item.tld);
        if (normalizedTld) {
          tldSet.add(normalizedTld);
        }
      }

      return Array.from(tldSet).sort();
    });

    return createSuccessResponse(tlds, Math.floor(TLD_CACHE_TTL_MS / 1000));
  } catch (error) {
    return handleServerError(error);
  }
}

export async function getAnalyticsResponse(params: URLSearchParams): Promise<ApiResponse> {
  try {
    const supabase = getSupabaseClient();
    const period = normalizePeriod(getStringParam(params, "period"));
    const normalizedTld = normalizeTldValue(getStringParam(params, "tld") || null);
    const days = getPeriodDays(period);

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const dateStr = dateThreshold.toISOString().split("T")[0];
    const globalAnalytics = await computeGlobalAnalytics(supabase, period, dateStr);
    const keywordStats = normalizedTld
      ? await computeFilteredKeywordStats(supabase, period, dateStr, normalizedTld)
      : globalAnalytics.keywordStats;

    return createSuccessResponse(
      {
        totalCount: globalAnalytics.totalCount,
        tldStats: globalAnalytics.tldStats,
        keywordStats,
        intelligence: globalAnalytics.intelligence,
      },
      Math.floor(ANALYTICS_CACHE_TTL_MS / 1000),
    );
  } catch (error) {
    return handleServerError(error);
  }
}
