export const ANALYTICS_SHARE_URL = "https://domaininsights.netlify.app/";

const SHARE_CARD_WIDTH = 1200;
const SHARE_CARD_HEIGHT = 675;
const countFormatter = new Intl.NumberFormat("en-US");
const growthFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

type AnalyticsApiShape = {
  totalCount?: number | null;
  tldStats?: Array<{ name?: string | null }> | null;
  keywordStats?: Array<{ name?: string | null }> | null;
  intelligence?: {
    risingKeywords?: Array<{
      name?: string | null;
      growthPercent?: number | string | null;
    }> | null;
  } | null;
};

export type AnalyticsShareSnapshot = {
  totalDomains: number;
  topTld: string;
  hotKeyword: string;
  risingKeyword: string;
  growthPercent: number;
  siteUrl: string;
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncateValue(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function normalizeCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeKeyword(value: string | null | undefined, fallback = "N/A") {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : fallback;
}

function normalizeTld(value: string | null | undefined) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return "N/A";
  }

  return trimmedValue.startsWith(".") ? trimmedValue : `.${trimmedValue}`;
}

function normalizeGrowth(value: number | string | null | undefined) {
  const parsedValue =
    typeof value === "number" ? value : Number.parseFloat(String(value ?? 0));
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatGrowth(value: number) {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${growthFormatter.format(Math.abs(value))}`;
}

export function buildAnalyticsShareSnapshot(
  analytics: AnalyticsApiShape | null | undefined,
): AnalyticsShareSnapshot {
  const risingKeyword = analytics?.intelligence?.risingKeywords?.[0];

  return {
    totalDomains: normalizeCount(analytics?.totalCount),
    topTld: normalizeTld(analytics?.tldStats?.[0]?.name),
    hotKeyword: normalizeKeyword(analytics?.keywordStats?.[0]?.name),
    risingKeyword: normalizeKeyword(risingKeyword?.name),
    growthPercent: normalizeGrowth(risingKeyword?.growthPercent),
    siteUrl: ANALYTICS_SHARE_URL,
  };
}

export function buildAnalyticsShareTweet(snapshot: AnalyticsShareSnapshot) {
  return [
    "\uD83D\uDEA8 Domain Market Update (Yesterday)",
    "",
    `\uD83D\uDCCA ${countFormatter.format(snapshot.totalDomains)} domains registered`,
    "",
    `\uD83D\uDD25 Top TLD: ${snapshot.topTld}`,
    `\uD83D\uDD25 Hot Keyword: ${snapshot.hotKeyword}`,
    "",
    `\uD83D\uDCC8 Rising Keyword: ${snapshot.risingKeyword} (${formatGrowth(snapshot.growthPercent)}% over previous day)`,
    "",
    "Explore trends , see what people are registering\uD83D\uDC47",
    snapshot.siteUrl,
  ].join("\n");
}

function buildAnalyticsShareCardSvg(snapshot: AnalyticsShareSnapshot) {
  const totalDomains = countFormatter.format(snapshot.totalDomains);
  const topTld = truncateValue(snapshot.topTld, 16);
  const hotKeyword = truncateValue(snapshot.hotKeyword, 28);
  const risingKeyword = truncateValue(snapshot.risingKeyword, 28);
  const growthPercent = `${formatGrowth(snapshot.growthPercent)}%`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_CARD_WIDTH}" height="${SHARE_CARD_HEIGHT}" viewBox="0 0 ${SHARE_CARD_WIDTH} ${SHARE_CARD_HEIGHT}" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="675" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fff7ed"/>
      <stop offset="0.45" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#eff6ff"/>
    </linearGradient>
    <linearGradient id="accent" x1="126" y1="184" x2="1074" y2="551" gradientUnits="userSpaceOnUse">
      <stop stop-color="#f97316"/>
      <stop offset="0.45" stop-color="#ec4899"/>
      <stop offset="1" stop-color="#3b82f6"/>
    </linearGradient>
    <linearGradient id="chip" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#0f172a"/>
      <stop offset="1" stop-color="#334155"/>
    </linearGradient>
    <filter id="shadow" x="80" y="120" width="1040" height="470" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="20" stdDeviation="28" flood-color="#0f172a" flood-opacity="0.12"/>
    </filter>
  </defs>

  <rect width="${SHARE_CARD_WIDTH}" height="${SHARE_CARD_HEIGHT}" rx="32" fill="url(#bg)"/>
  <circle cx="1084" cy="90" r="118" fill="#f97316" fill-opacity="0.08"/>
  <circle cx="156" cy="598" r="132" fill="#3b82f6" fill-opacity="0.08"/>

  <g filter="url(#shadow)">
    <rect x="88" y="108" width="1024" height="460" rx="32" fill="white"/>
  </g>

  <rect x="126" y="146" width="238" height="38" rx="19" fill="url(#chip)"/>
  <text x="156" y="170" fill="white" font-size="16" font-weight="700" font-family="'Segoe UI', Arial, sans-serif" letter-spacing="1.2">DomainInsights</text>

  <text x="126" y="246" fill="#0f172a" font-size="52" font-weight="800" font-family="'Segoe UI', Arial, sans-serif">Domain Market Update</text>
  <text x="126" y="286" fill="#64748b" font-size="24" font-weight="600" font-family="'Segoe UI', Arial, sans-serif">Yesterday Snapshot</text>

  <rect x="126" y="326" width="268" height="132" rx="24" fill="#fff7ed" stroke="#fed7aa"/>
  <text x="156" y="362" fill="#9a3412" font-size="16" font-weight="700" font-family="'Segoe UI', Arial, sans-serif" letter-spacing="1">TOTAL REGISTERED</text>
  <text x="156" y="420" fill="#0f172a" font-size="42" font-weight="800" font-family="'Segoe UI', Arial, sans-serif">${escapeXml(totalDomains)}</text>
  <text x="156" y="448" fill="#64748b" font-size="18" font-weight="600" font-family="'Segoe UI', Arial, sans-serif">domains registered</text>

  <rect x="422" y="326" width="268" height="132" rx="24" fill="#fdf4ff" stroke="#f5d0fe"/>
  <text x="452" y="362" fill="#a21caf" font-size="16" font-weight="700" font-family="'Segoe UI', Arial, sans-serif" letter-spacing="1">TOP TLD</text>
  <text x="452" y="420" fill="#0f172a" font-size="42" font-weight="800" font-family="'Segoe UI', Arial, sans-serif">${escapeXml(topTld)}</text>
  <text x="452" y="448" fill="#64748b" font-size="18" font-weight="600" font-family="'Segoe UI', Arial, sans-serif">strongest extension</text>

  <rect x="718" y="326" width="356" height="132" rx="24" fill="#eff6ff" stroke="#bfdbfe"/>
  <text x="748" y="362" fill="#1d4ed8" font-size="16" font-weight="700" font-family="'Segoe UI', Arial, sans-serif" letter-spacing="1">HOT KEYWORD</text>
  <text x="748" y="420" fill="#0f172a" font-size="38" font-weight="800" font-family="'Segoe UI', Arial, sans-serif">${escapeXml(hotKeyword)}</text>
  <text x="748" y="448" fill="#64748b" font-size="18" font-weight="600" font-family="'Segoe UI', Arial, sans-serif">most active keyword</text>

  <rect x="126" y="482" width="948" height="54" rx="27" fill="url(#accent)"/>
  <text x="156" y="516" fill="white" font-size="22" font-weight="800" font-family="'Segoe UI', Arial, sans-serif">Rising Keyword: ${escapeXml(risingKeyword)}(${escapeXml(growthPercent)})</text>

  <text x="126" y="608" fill="#64748b" font-size="20" font-weight="600" font-family="'Segoe UI', Arial, sans-serif">Explore trends and see what people are registering</text>
  <text x="126" y="636" fill="#0f172a" font-size="22" font-weight="800" font-family="'Segoe UI', Arial, sans-serif">${escapeXml(snapshot.siteUrl)}</text>
</svg>
`;
}

async function createImageFromSvg(svg: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to render share card image."));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export async function createAnalyticsShareCardBlob(snapshot: AnalyticsShareSnapshot) {
  const svg = buildAnalyticsShareCardSvg(snapshot);
  const image = await createImageFromSvg(svg);
  const canvas = document.createElement("canvas");

  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is unavailable for share card generation.");
  }

  context.drawImage(image, 0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Unable to export the share card."));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

export function getAnalyticsTweetIntentUrl(snapshot: AnalyticsShareSnapshot) {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(buildAnalyticsShareTweet(snapshot))}`;
}
