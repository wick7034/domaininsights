import React from "react";
import type { DomainIntelligenceData } from "../../../lib/analytics";

type NewAnalyticsSectionProps = {
  data?: DomainIntelligenceData;
};

const countFormatter = new Intl.NumberFormat("en-US");

type SectionTheme = {
  shell: string;
  title: string;
  chip: string;
  track: string;
  value: string;
  barFrom: string;
  barTo: string;
};

const ROW_GRADIENTS = [
  { from: "#f43f5e", to: "#fb7185", chip: "bg-rose-500" },
  { from: "#f97316", to: "#fb923c", chip: "bg-orange-500" },
  { from: "#0ea5e9", to: "#38bdf8", chip: "bg-sky-500" },
  { from: "#14b8a6", to: "#2dd4bf", chip: "bg-teal-500" },
  { from: "#8b5cf6", to: "#a78bfa", chip: "bg-violet-500" },
  { from: "#84cc16", to: "#a3e635", chip: "bg-lime-500" },
];

const TLD_THEME: SectionTheme = {
  shell: "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50",
  title: "text-rose-600",
  chip: "bg-rose-500",
  track: "bg-rose-100/80",
  value: "text-rose-700",
  barFrom: "#f43f5e",
  barTo: "#f97316",
};

const LENGTH_THEME: SectionTheme = {
  shell: "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50",
  title: "text-sky-600",
  chip: "bg-sky-500",
  track: "bg-sky-100/80",
  value: "text-sky-700",
  barFrom: "#0ea5e9",
  barTo: "#14b8a6",
};

const QUALITY_THEME: SectionTheme = {
  shell: "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50",
  title: "text-emerald-600",
  chip: "bg-emerald-500",
  track: "bg-emerald-100/80",
  value: "text-emerald-700",
  barFrom: "#10b981",
  barTo: "#84cc16",
};

const HEATMAP_THEME: SectionTheme = {
  shell: "border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50",
  title: "text-violet-600",
  chip: "bg-violet-500",
  track: "bg-violet-100/80",
  value: "text-violet-700",
  barFrom: "#8b5cf6",
  barTo: "#ec4899",
};

const RISING_THEME: SectionTheme = {
  shell: "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50",
  title: "text-amber-600",
  chip: "bg-amber-500",
  track: "bg-amber-100/80",
  value: "text-amber-700",
  barFrom: "#f59e0b",
  barTo: "#f97316",
};

const QUALITY_ROW_GRADIENTS: Record<string, { from: string; to: string; chip: string; text: string }> = {
  brandable: {
    from: "#10b981",
    to: "#34d399",
    chip: "bg-emerald-500",
    text: "text-emerald-700",
  },
  hasNumbers: {
    from: "#f59e0b",
    to: "#fbbf24",
    chip: "bg-amber-500",
    text: "text-amber-700",
  },
  hasHyphen: {
    from: "#6366f1",
    to: "#8b5cf6",
    chip: "bg-indigo-500",
    text: "text-indigo-700",
  },
};

function hexToRgba(hex: string, alpha: number) {
  const normalizedHex = hex.replace("#", "");
  const value = normalizedHex.length === 3
    ? normalizedHex
        .split("")
        .map((char) => char + char)
        .join("")
    : normalizedHex;

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getHeatmapCellStyle(value: number, maxValue: number, columnIndex: number) {
  const accent = ROW_GRADIENTS[columnIndex % ROW_GRADIENTS.length];
  const intensity = maxValue > 0 ? value / maxValue : 0;
  const alpha = value > 0 ? 0.14 + intensity * 0.58 : 0.06;

  return {
    backgroundColor: hexToRgba(accent.from, alpha),
    color: intensity > 0.45 ? "#0f172a" : "#475569",
    boxShadow: `inset 0 0 0 1px ${hexToRgba(accent.from, Math.max(0.08, alpha * 0.65))}`,
  };
}

function MiniBar({
  value,
  maxValue,
  startColor,
  endColor,
  trackClassName,
}: {
  value: number;
  maxValue: number;
  startColor: string;
  endColor: string;
  trackClassName: string;
}) {
  const width = maxValue > 0 ? Math.max(8, Math.round((value / maxValue) * 100)) : 0;

  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full ${trackClassName}`}>
      <div
        className="h-full rounded-full bg-slate-900"
        style={{
          width: `${Math.min(width, 100)}%`,
          background: `linear-gradient(90deg, ${startColor} 0%, ${endColor} 100%)`,
        }}
      />
    </div>
  );
}

function SectionShell({
  title,
  children,
  className = "",
  theme,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  theme: SectionTheme;
}) {
  return (
    <section className={`rounded-2xl border p-4 shadow-sm ${theme.shell} ${className}`}>
      <div className={`mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] ${theme.title}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${theme.chip}`} />
        {title}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="text-xs text-slate-400">{label}</div>;
}

function formatGrowth(value: number) {
  const rounded = Number(value.toFixed(1));
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

export const NewAnalyticsSection: React.FC<NewAnalyticsSectionProps> = ({ data }) => {
  if (!data) {
    return null;
  }

  const risingKeywords = data.risingKeywords || [];
  const tldDistribution = data.tldDistribution || [];
  const lengthBuckets = data.lengthBuckets || [];
  const qualityStats = data.qualityStats || [];
  const heatmap = data.heatmap;
  const heatmapMax = Math.max(
    ...(heatmap?.rows.flatMap((row) => heatmap.tlds.map((tld) => row.counts[tld] || 0)) || [0]),
  );

  const tldMax = tldDistribution[0]?.value || 0;
  const lengthMax = Math.max(...lengthBuckets.map((item) => item.value), 0);
  const qualityMax = Math.max(...qualityStats.map((item) => item.percentage), 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-slate-900">Domain Intelligence</h3>
        
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionShell title="TLD Distribution" theme={TLD_THEME}>
          {tldDistribution.length === 0 ? (
            <EmptyState label="No TLD distribution data yet." />
          ) : (
            <div className="space-y-2">
              {tldDistribution.slice(0, 10).map((item, index) => {
                const accent = ROW_GRADIENTS[index % ROW_GRADIENTS.length];

                return (
                <div
                  key={item.name}
                  className="space-y-1.5 rounded-xl border border-white/70 bg-white/70 px-3 py-2 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-2 font-semibold text-slate-900">
                      <span className={`h-2 w-2 rounded-full ${accent.chip}`} />
                      .{item.name}
                    </span>
                    <span className={`font-semibold ${TLD_THEME.value}`}>
                      {countFormatter.format(item.value)}
                    </span>
                  </div>
                  <MiniBar
                    value={item.value}
                    maxValue={tldMax}
                    startColor={accent.from}
                    endColor={accent.to}
                    trackClassName={TLD_THEME.track}
                  />
                </div>
              )})}
            </div>
          )}
        </SectionShell>

        <SectionShell title="Domain Length Distribution" theme={LENGTH_THEME}>
          {lengthBuckets.length === 0 ? (
            <EmptyState label="No length bucket data yet." />
          ) : (
            <div className="space-y-2">
              {lengthBuckets.map((item, index) => {
                const accent = ROW_GRADIENTS[(index + 2) % ROW_GRADIENTS.length];

                return (
                <div
                  key={item.name}
                  className="space-y-1.5 rounded-xl border border-white/70 bg-white/70 px-3 py-2 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-2 font-semibold text-slate-900">
                      <span className={`h-2 w-2 rounded-full ${accent.chip}`} />
                      {item.name}
                    </span>
                    <span className={`font-semibold ${LENGTH_THEME.value}`}>
                      {countFormatter.format(item.value)}
                    </span>
                  </div>
                  <MiniBar
                    value={item.value}
                    maxValue={lengthMax}
                    startColor={accent.from}
                    endColor={accent.to}
                    trackClassName={LENGTH_THEME.track}
                  />
                </div>
              )})}
            </div>
          )}
        </SectionShell>

        <SectionShell title="Domain Quality Breakdown" theme={QUALITY_THEME}>
          {qualityStats.length === 0 ? (
            <EmptyState label="No quality breakdown data yet." />
          ) : (
            <div className="space-y-2">
              {qualityStats.map((item) => (
                <div
                  key={item.name}
                  className="space-y-1.5 rounded-xl border border-white/70 bg-white/75 px-3 py-2 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-2 font-semibold text-slate-900">
                      <span
                        className={`h-2 w-2 rounded-full ${QUALITY_ROW_GRADIENTS[item.name].chip}`}
                      />
                      {item.label}
                    </span>
                    <span className={`font-semibold ${QUALITY_ROW_GRADIENTS[item.name].text}`}>
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <MiniBar
                    value={item.percentage}
                    maxValue={qualityMax}
                    startColor={QUALITY_ROW_GRADIENTS[item.name].from}
                    endColor={QUALITY_ROW_GRADIENTS[item.name].to}
                    trackClassName={QUALITY_THEME.track}
                  />
                  <div className="text-[11px] text-slate-400">
                    {countFormatter.format(item.value)} domains
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionShell>
      </div>

      <SectionShell title="Rising Keywords" theme={RISING_THEME}>
        {risingKeywords.length === 0 ? (
          <EmptyState label="No day-over-day keyword growth data yet." />
        ) : (
          <div className="space-y-3">
            <div className="text-[11px] text-slate-500">
              Top 20 keyword growth for yesterday versus the day before yesterday.
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
              {risingKeywords.slice(0, 20).map((item, index) => {
                const accent = ROW_GRADIENTS[(index + 1) % ROW_GRADIENTS.length];

                return (
                  <div
                    key={item.name}
                    className="rounded-xl border border-white/80 bg-white/75 px-3 py-2.5 backdrop-blur-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${accent.chip}`} />
                          <span className="truncate text-sm font-semibold text-slate-900">{item.name}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                          <span>Yesterday {countFormatter.format(item.currentValue)}</span>
                          <span className="text-slate-300">/</span>
                          <span>Prev {countFormatter.format(item.previousValue)}</span>
                        </div>
                      </div>

                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        {formatGrowth(item.growthPercent)}
                      </span>
                    </div>

                    <div className="mt-2">
                      <MiniBar
                        value={item.currentValue}
                        maxValue={Math.max(item.currentValue, item.previousValue, 1)}
                        startColor={accent.from}
                        endColor={accent.to}
                        trackClassName={RISING_THEME.track}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SectionShell>

      <SectionShell title="Keyword + TLD Heatmap" theme={HEATMAP_THEME}>
        {!heatmap || heatmap.rows.length === 0 ? (
          <EmptyState label="No keyword/TLD heatmap data yet." />
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {heatmap.rows.map((row) => (
                <div
                  key={row.keyword}
                  className="rounded-xl border border-white/80 bg-white/75 p-3 backdrop-blur-sm"
                >
                  <div className="mb-2 text-xs font-semibold text-slate-900">{row.keyword}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {heatmap.tlds.map((tld, columnIndex) => (
                      <div
                        key={`${row.keyword}-${tld}`}
                        className="rounded-lg px-2 py-1.5"
                        style={getHeatmapCellStyle(row.counts[tld] || 0, heatmapMax, columnIndex)}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          .{tld}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-900">
                          {countFormatter.format(row.counts[tld] || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-xl border border-white/80 bg-white/70 md:block">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-white/80">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-slate-400">
                      Keyword
                    </th>
                    {heatmap.tlds.map((tld, columnIndex) => (
                      <th
                        key={tld}
                        className="px-3 py-2 text-right font-bold uppercase tracking-wider text-slate-400"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${ROW_GRADIENTS[columnIndex % ROW_GRADIENTS.length].chip}`}
                          />
                          .{tld}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/70">
                  {heatmap.rows.map((row) => (
                    <tr key={row.keyword}>
                      <td className="px-3 py-2 font-semibold text-slate-900">{row.keyword}</td>
                      {heatmap.tlds.map((tld, columnIndex) => (
                        <td
                          key={`${row.keyword}-${tld}`}
                          className="px-3 py-2 text-right font-medium"
                          style={getHeatmapCellStyle(row.counts[tld] || 0, heatmapMax, columnIndex)}
                        >
                          {countFormatter.format(row.counts[tld] || 0)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionShell>
    </div>
  );
};
