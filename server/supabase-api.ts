import { createClient } from "@supabase/supabase-js";

export type ApiResponse = {
  status: number;
  body: unknown;
};

type DomainTldRow = {
  tld: string | null;
};

type AnalyticsRow = {
  tld: string | null;
  keywords: string[] | null;
};

let supabaseClient: ReturnType<typeof createClient> | null = null;

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

    if (startsWith) query = query.ilike("domain", `${startsWith}%`);
    if (endsWith) query = query.ilike("domain", `%${endsWith}`);

    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(page * limit, (page + 1) * limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return {
      status: 200,
      body: { data, count },
    };
  } catch (error) {
    return handleServerError(error);
  }
}

export async function getTldsResponse(): Promise<ApiResponse> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("domains").select("tld").limit(1000000);

    if (error) {
      throw error;
    }

    const rows = (data || []) as DomainTldRow[];
    const tldSet = new Set<string>();

    for (const item of rows) {
      if (!item.tld) continue;

      let tld = item.tld.trim().toLowerCase();
      if (tld.startsWith(".")) {
        tld = tld.slice(1);
      }

      if (tld) {
        tldSet.add(tld);
      }
    }

    return {
      status: 200,
      body: Array.from(tldSet).sort(),
    };
  } catch (error) {
    return handleServerError(error);
  }
}

export async function getAnalyticsResponse(params: URLSearchParams): Promise<ApiResponse> {
  try {
    const supabase = getSupabaseClient();
    const period = normalizePeriod(getStringParam(params, "period"));
    let tld = getStringParam(params, "tld");

    if (tld) {
      tld = tld.toLowerCase();
      if (tld.startsWith(".")) {
        tld = tld.slice(1);
      }
    }

    let days = 7;
    if (period === "1d") days = 1;
    if (period === "30d") days = 30;

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const dateStr = dateThreshold.toISOString().split("T")[0];

    const getAggregatedStats = async (filterTld?: string) => {
      const tldCounts: Record<string, number> = {};
      const keywordCounts: Record<string, number> = {};
      const stopWords = new Set([
        "the",
        "in",
        "is",
        "co",
        "as",
        "to",
        "and",
        "get",
        "at",
        "an",
        "de",
        "my",
        "on",
        "of",
        "a",
        "for",
        "with",
        "by",
        "it",
        "or",
        "me",
        "do",
        "be",
        "la",
        "no",
        "re",
        "xn",
        "us",
        "so",
        "en",
      ]);

      let from = 0;
      let to = 999;
      let finished = false;
      let totalProcessed = 0;

      while (!finished) {
        let query = supabase.from("domains").select("tld,keywords").gte("created_at", dateStr);

        if (filterTld) {
          const normalizedTld = filterTld.trim().toLowerCase();
          const tldWithDot = normalizedTld.startsWith(".") ? normalizedTld : `.${normalizedTld}`;
          const tldWithoutDot = normalizedTld.startsWith(".")
            ? normalizedTld.slice(1)
            : normalizedTld;
          query = query.or(`tld.ilike.${tldWithoutDot},tld.ilike.${tldWithDot}`);
        }

        const { data, error } = await query.range(from, to);

        if (error) {
          throw error;
        }

        const rows = (data || []) as AnalyticsRow[];

        if (rows.length === 0) {
          finished = true;
          continue;
        }

        for (const item of rows) {
          if (item.tld) {
            let domainTld = item.tld.toLowerCase();
            if (domainTld.startsWith(".")) {
              domainTld = domainTld.slice(1);
            }
            tldCounts[domainTld] = (tldCounts[domainTld] || 0) + 1;
          }

          if (item.keywords && Array.isArray(item.keywords)) {
            for (const keyword of item.keywords) {
              const normalizedKeyword = String(keyword).toLowerCase();
              if (!stopWords.has(normalizedKeyword) && normalizedKeyword.length > 1) {
                keywordCounts[normalizedKeyword] = (keywordCounts[normalizedKeyword] || 0) + 1;
              }
            }
          }
        }

        totalProcessed += rows.length;

        if (rows.length < 1000 || totalProcessed > 5000000) {
          finished = true;
        } else {
          from += 1000;
          to += 1000;
        }
      }

      return { tldCounts, keywordCounts };
    };

    let countQuery = supabase.from("domains").select("*", { count: "exact", head: true });
    countQuery = countQuery.gte("created_at", dateStr);

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }

    const { tldCounts, keywordCounts } = await getAggregatedStats(tld);

    const tldStats = Object.entries(tldCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const keywordStats = Object.entries(keywordCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);

    return {
      status: 200,
      body: {
        totalCount,
        tldStats,
        keywordStats,
      },
    };
  } catch (error) {
    return handleServerError(error);
  }
}
