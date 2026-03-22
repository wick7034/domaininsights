import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function createApp() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get("/api/domains", async (req, res) => {
    // ... existing logic ...
    try {
      const { 
        page = 0, 
        limit = 100,
        tlds,
        minLength,
        maxLength,
        numbers,
        hyphens,
        keywords,
        startsWith,
        endsWith,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = req.query;

      let query = supabase.from("domains").select("*", { count: "exact" });

      // Apply Filters
      if (tlds) {
        const tldList = (tlds as string).split(",").map(t => t.trim().toLowerCase());
        const expandedTldList: string[] = [];
        tldList.forEach(t => {
          const tldWithoutDot = t.startsWith('.') ? t.substring(1) : t;
          const tldWithDot = `.${tldWithoutDot}`;
          expandedTldList.push(tldWithoutDot, tldWithDot);
        });
        query = query.in("tld", expandedTldList);
      }

      if (minLength) query = query.gte("length", parseInt(minLength as string));
      if (maxLength) query = query.lte("length", parseInt(maxLength as string));

      if (numbers === 'none') query = query.eq("has_numbers", false);
      if (numbers === 'only') query = query.eq("is_number_only", true);
      if (numbers === 'contains') query = query.eq("has_numbers", true);

      if (hyphens === 'exclude') query = query.eq("has_hyphen", false);

      if (keywords) {
        const keywordList = (keywords as string).split(",");
        query = query.contains("keywords", keywordList);
      }

      if (startsWith) query = query.ilike("domain", `${startsWith}%`);
      if (endsWith) query = query.ilike("domain", `%${endsWith}`);

      // Sorting & Pagination
      query = query.order(sortBy as string, { ascending: sortOrder === 'asc' })
                   .range(Number(page) * Number(limit), (Number(page) + 1) * Number(limit) - 1);

      const { data, error, count } = await query;

      if (error) throw error;
      res.json({ data, count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tlds", async (req, res) => {
    try {
      // Fetch unique TLDs from the domains table
      // We fetch a larger sample to ensure we get all common TLDs
      const { data, error } = await supabase
        .from('domains')
        .select('tld')
        .limit(1000000);

      if (error) throw error;

      // Extract unique TLDs, filter out nulls/empty, and sort
      const tldSet = new Set<string>();
      data.forEach(d => {
        if (d.tld) {
          let t = d.tld.trim().toLowerCase();
          if (t.startsWith('.')) t = t.substring(1);
          if (t) tldSet.add(t);
        }
      });

      const uniqueTlds = Array.from(tldSet).sort();
      res.json(uniqueTlds);
    } catch (error: any) {
      console.error('Error fetching TLDs:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analytics", async (req, res) => {
    try {
      const period = (req.query.period as string) || '7d';
      let tld = req.query.tld as string | undefined;
      
      // Clean up TLD: remove leading dot and trim
      if (tld) {
        tld = tld.trim().toLowerCase();
        if (tld.startsWith('.')) {
          tld = tld.substring(1);
        }
      }

      console.log(`[Analytics] Fetching data for period: ${period}, tld: ${tld || 'all'}`);

      let days = 7;
      if (period === '1d') days = 1;
      else if (period === '30d') days = 30;

      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      const dateStr = dateThreshold.toISOString().split('T')[0];
      console.log(`[Analytics] Date threshold: ${dateStr}`);

      // Helper to fetch and aggregate data in chunks to avoid memory issues with millions of rows
      const getAggregatedStats = async (filterTld?: string) => {
        const tldCounts: Record<string, number> = {};
        const keywordCounts: Record<string, number> = {};
        const STOP_WORDS = new Set(['the', 'in', 'is', 'co', 'as', 'to', 'and', 'get', 'at', 'an', 'de', 'my', 'on', 'of', 'a', 'for', 'with', 'by', 'it', 'or', 'me', 'do', 'be', 'la', 'no', 're', 'xn', 'us', 'so', 'en']);
        
        let from = 0;
        let to = 999;
        let finished = false;
        let totalProcessed = 0;

        console.log(`[Analytics] Starting streaming aggregation...`);

        while (!finished) {
          let query = supabase
            .from('domains')
            .select('tld,keywords');

          if (dateStr) {
            query = query.gte('created_at', dateStr);
          }

          if (filterTld && filterTld !== '') {
            const tldClean = filterTld.trim().toLowerCase();
            const tldWithDot = tldClean.startsWith('.') ? tldClean : `.${tldClean}`;
            const tldWithoutDot = tldClean.startsWith('.') ? tldClean.substring(1) : tldClean;
            query = query.or(`tld.ilike.${tldWithoutDot},tld.ilike.${tldWithDot}`);
          }

          const { data, error } = await query.range(from, to);

          if (error) {
            console.error(`[Analytics] Fetch error at range ${from}-${to}:`, error);
            throw error;
          }

          if (!data || data.length === 0) {
            finished = true;
          } else {
            // Process chunk
            data.forEach(d => {
              // 1. Aggregate TLDs
              if (d.tld) {
                let t = d.tld.toLowerCase();
                if (t.startsWith('.')) t = t.substring(1);
                tldCounts[t] = (tldCounts[t] || 0) + 1;
              }

              // 2. Aggregate Keywords
              if (d.keywords && Array.isArray(d.keywords)) {
                d.keywords.forEach((k: string) => {
                  const lowerK = k.toLowerCase();
                  if (!STOP_WORDS.has(lowerK) && lowerK.length > 1) {
                    keywordCounts[lowerK] = (keywordCounts[lowerK] || 0) + 1;
                  }
                });
              }
            });

            totalProcessed += data.length;
            
            // If we got fewer than 1000 rows, we've reached the end
            if (data.length < 1000) {
              finished = true;
            } else {
              from += 1000;
              to += 1000;
              
              // Safety break to prevent infinite loops in case of unexpected API behavior
              if (totalProcessed > 5000000) { // 5 million row safety cap for a single request
                console.warn(`[Analytics] Reached 5M row safety cap, stopping aggregation.`);
                finished = true;
              }
            }
          }
        }

        return { tldCounts, keywordCounts, totalProcessed };
      };

      // 1. Total Count (Always Global)
      let countQuery = supabase
        .from('domains')
        .select('*', { count: 'exact', head: true });

      if (dateStr) {
        countQuery = countQuery.gte('created_at', dateStr);
      }

      const { count: totalCount, error: countError } = await countQuery;

      if (countError) {
        console.error(`[Analytics] Count error:`, countError);
        throw countError;
      }
      
      console.log(`[Analytics] Global total count: ${totalCount}`);

      // 2. Fetch and Aggregate Stats
      // We perform one pass to get both TLD stats and keyword stats
      // If a TLD is selected, we filter the keywords accordingly
      const { tldCounts, keywordCounts, totalProcessed } = await getAggregatedStats(tld);

      console.log(`[Analytics] Aggregation complete. Processed ${totalProcessed} rows.`);
      
      // 3. Format TLD Stats
      const tldStats = Object.entries(tldCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // 4. Format Keyword Stats
      const keywordStats = Object.entries(keywordCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 20);

      res.json({
        totalCount,
        tldStats,
        keywordStats
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

const PORT = process.env.PORT || 3000;

async function startServer() {
  await createApp();
}

startServer();
