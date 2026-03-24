-- Additional analytics RPCs for the appended Domain Intelligence section.
-- Run these in Supabase SQL editor to refresh the keyword-based functions as well.

CREATE OR REPLACE FUNCTION get_top_keywords(
  date_threshold TEXT,
  filter_tld TEXT DEFAULT NULL,
  max_rows INT DEFAULT 20
)
RETURNS TABLE(name TEXT, value BIGINT) AS $$
BEGIN
  RETURN QUERY
  WITH stop_words AS (
    SELECT UNNEST(ARRAY[
      'the', 'in', 'is', 'co', 'as', 'to', 'and', 'get', 'at', 'an',
      'de', 'my', 'on', 'of', 'a', 'for', 'with', 'by', 'it', 'or',
      'me', 'do', 'be', 'la', 'no', 're', 'xn', 'us', 'so', 'en'
    ]) AS word
  ),
  keyword_counts AS (
    SELECT
      LOWER(keyword) AS keyword,
      COUNT(*)::BIGINT AS count
    FROM domains,
    LATERAL UNNEST(keywords) AS keyword
    WHERE created_at >= date_threshold::date
      AND (filter_tld IS NULL OR
           LOWER(tld) = LOWER(filter_tld) OR
           LOWER(tld) = LOWER('.' || filter_tld))
      AND CHARACTER_LENGTH(keyword) > 2
    GROUP BY 1
  )
  SELECT
    keyword AS name,
    count AS value
  FROM keyword_counts
  WHERE NOT EXISTS (
    SELECT 1 FROM stop_words WHERE stop_words.word = keyword_counts.keyword
  )
  ORDER BY value DESC, name ASC
  LIMIT max_rows;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_rising_keywords(
  current_date_threshold TEXT,
  previous_date_threshold TEXT,
  max_rows INT DEFAULT 5
)
RETURNS TABLE(
  name TEXT,
  current_value BIGINT,
  previous_value BIGINT,
  growth_pct NUMERIC
) AS $$
WITH stop_words AS (
  SELECT UNNEST(ARRAY[
    'the', 'in', 'is', 'co', 'as', 'to', 'and', 'get', 'at', 'an',
    'de', 'my', 'on', 'of', 'a', 'for', 'with', 'by', 'it', 'or',
    'me', 'do', 'be', 'la', 'no', 're', 'xn', 'us', 'so', 'en'
  ]) AS word
),
current_keywords AS (
  SELECT
    LOWER(keyword) AS keyword,
    COUNT(*)::BIGINT AS current_value
  FROM domains,
  LATERAL UNNEST(keywords) AS keyword
  WHERE created_at >= current_date_threshold::date
    AND CHARACTER_LENGTH(keyword) > 2
  GROUP BY 1
),
previous_keywords AS (
  SELECT
    LOWER(keyword) AS keyword,
    COUNT(*)::BIGINT AS previous_value
  FROM domains,
  LATERAL UNNEST(keywords) AS keyword
  WHERE created_at >= previous_date_threshold::date
    AND created_at < current_date_threshold::date
    AND CHARACTER_LENGTH(keyword) > 2
  GROUP BY 1
),
combined AS (
  SELECT
    COALESCE(current_keywords.keyword, previous_keywords.keyword) AS keyword,
    COALESCE(current_keywords.current_value, 0) AS current_value,
    COALESCE(previous_keywords.previous_value, 0) AS previous_value
  FROM current_keywords
  FULL OUTER JOIN previous_keywords USING (keyword)
)
SELECT
  combined.keyword AS name,
  combined.current_value,
  combined.previous_value,
  CASE
    WHEN combined.previous_value = 0 AND combined.current_value > 0 THEN 100
    WHEN combined.previous_value = 0 THEN 0
    ELSE ROUND((((combined.current_value - combined.previous_value)::NUMERIC / combined.previous_value) * 100), 1)
  END AS growth_pct
FROM combined
WHERE combined.current_value > 0
  AND NOT EXISTS (
    SELECT 1 FROM stop_words WHERE stop_words.word = combined.keyword
  )
ORDER BY growth_pct DESC, current_value DESC
LIMIT max_rows;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_length_buckets(
  date_threshold TEXT
)
RETURNS TABLE(name TEXT, value BIGINT) AS $$
SELECT
  bucket AS name,
  COUNT(*)::BIGINT AS value
FROM (
  SELECT
    CASE
      WHEN length BETWEEN 1 AND 5 THEN '1-5'
      WHEN length BETWEEN 6 AND 10 THEN '6-10'
      WHEN length BETWEEN 11 AND 15 THEN '11-15'
      ELSE '15+'
    END AS bucket
  FROM domains
  WHERE created_at >= date_threshold::date
) buckets
GROUP BY bucket
ORDER BY
  CASE bucket
    WHEN '1-5' THEN 1
    WHEN '6-10' THEN 2
    WHEN '11-15' THEN 3
    ELSE 4
  END;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_quality_stats(
  date_threshold TEXT
)
RETURNS TABLE(
  brandable_count BIGINT,
  has_numbers_count BIGINT,
  has_hyphen_count BIGINT,
  total_count BIGINT
) AS $$
SELECT
  COUNT(*) FILTER (
    WHERE COALESCE(has_numbers, FALSE) = FALSE
      AND COALESCE(has_hyphen, FALSE) = FALSE
  )::BIGINT AS brandable_count,
  COUNT(*) FILTER (WHERE COALESCE(has_numbers, FALSE) = TRUE)::BIGINT AS has_numbers_count,
  COUNT(*) FILTER (WHERE COALESCE(has_hyphen, FALSE) = TRUE)::BIGINT AS has_hyphen_count,
  COUNT(*)::BIGINT AS total_count
FROM domains
WHERE created_at >= date_threshold::date;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_keyword_tld_heatmap(
  date_threshold TEXT,
  keyword_limit INT DEFAULT 20,
  tld_limit INT DEFAULT 5
)
RETURNS TABLE(
  keyword TEXT,
  tld TEXT,
  value BIGINT
) AS $$
WITH top_keywords AS (
  SELECT
    name,
    ROW_NUMBER() OVER (ORDER BY value DESC, name ASC) AS keyword_rank
  FROM get_top_keywords(date_threshold, NULL, keyword_limit)
),
top_tlds AS (
  SELECT
    name,
    100 + ROW_NUMBER() OVER (ORDER BY value DESC, name ASC) AS tld_rank
  FROM get_top_tlds(date_threshold, NULL, tld_limit)
),
selected_tlds AS (
  SELECT 'ai'::TEXT AS name, 1 AS tld_rank
  UNION
  SELECT 'io'::TEXT AS name, 2 AS tld_rank
  UNION
  SELECT name, tld_rank
  FROM top_tlds
  WHERE name NOT IN ('ai', 'io')
),
normalized_domains AS (
  SELECT
    LOWER(keyword) AS keyword,
    CASE
      WHEN domains.tld IS NULL THEN 'unknown'
      WHEN domains.tld LIKE '.%' THEN LOWER(SUBSTR(domains.tld, 2))
      ELSE LOWER(domains.tld)
    END AS tld
  FROM domains,
  LATERAL UNNEST(keywords) AS keyword
  WHERE created_at >= date_threshold::date
    AND CHARACTER_LENGTH(keyword) > 2
),
aggregated_counts AS (
  SELECT
    normalized_domains.keyword,
    normalized_domains.tld,
    COUNT(*)::BIGINT AS value
  FROM normalized_domains
  GROUP BY normalized_domains.keyword, normalized_domains.tld
)
SELECT
  top_keywords.name AS keyword,
  selected_tlds.name AS tld,
  COALESCE(aggregated_counts.value, 0)::BIGINT AS value
FROM top_keywords
CROSS JOIN selected_tlds
LEFT JOIN aggregated_counts
  ON aggregated_counts.keyword = top_keywords.name
 AND aggregated_counts.tld = selected_tlds.name
ORDER BY top_keywords.keyword_rank, selected_tlds.tld_rank, selected_tlds.name;
$$ LANGUAGE SQL;
