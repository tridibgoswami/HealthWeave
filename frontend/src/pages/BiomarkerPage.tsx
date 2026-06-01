import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";
import {
  FlaskConical, TrendingUp, TrendingDown, Minus, ChevronDown,
  ChevronUp, AlertTriangle, CheckCircle2, Activity, Table2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { intelligenceApi } from "../services/api";
import { cn } from "../utils/cn";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Reading { date: string; value: number; status: string; unit?: string }
interface Biomarker {
  name: string; display_name: string; unit: string;
  readings: Reading[]; latest_value: number | null;
  latest_status: string; reference_range: { min: number | null; max: number | null };
  trend: string; change_percent: number | null; total_readings: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  normal: "#10B981", high: "#EF4444", low: "#F59E0B",
  critical: "#7C3AED", unknown: "#94A3B8",
};

const STATUS_BADGE: Record<string, string> = {
  normal:   "bg-emerald-100 text-emerald-700",
  high:     "bg-red-100 text-red-700",
  low:      "bg-amber-100 text-amber-700",
  critical: "bg-purple-100 text-purple-700",
  unknown:  "bg-slate-100 text-slate-500",
};

function TrendIcon({ trend, change }: { trend: string; change: number | null }) {
  if (trend === "rising")  return <TrendingUp size={14} className="text-red-500" />;
  if (trend === "falling") return <TrendingDown size={14} className="text-emerald-500" />;
  return <Minus size={14} className="text-slate-400" />;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card p-3 text-xs">
      <p className="text-slate-500 mb-1">{label}</p>
      <p className="font-bold text-slate-800">{d.value} <span className="font-normal text-slate-400">{d.payload?.unit}</span></p>
      <p className={cn("font-semibold mt-0.5 capitalize", STATUS_BADGE[d.payload?.status] || STATUS_BADGE.unknown)}>
        {d.payload?.status || "unknown"}
      </p>
    </div>
  );
};

function BiomarkerChart({ bm }: { bm: Biomarker }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_COLOR[bm.latest_status] || STATUS_COLOR.unknown;
  const statusBadge = STATUS_BADGE[bm.latest_status] || STATUS_BADGE.unknown;

  const chartData = bm.readings.map(r => ({
    date: format(parseISO(r.date), "MMM yy"),
    value: r.value,
    status: r.status,
    unit: bm.unit,
    fullDate: r.date,
  }));

  const refMin = bm.reference_range.min;
  const refMax = bm.reference_range.max;
  const allVals = bm.readings.map(r => r.value);
  const yMin = Math.min(...allVals, refMin ?? Infinity) * 0.9;
  const yMax = Math.max(...allVals, refMax ?? -Infinity) * 1.1;

  const needsAttention = ["high", "low", "critical"].includes(bm.latest_status);

  return (
    <div className={cn(
      "bg-white border rounded-2xl overflow-hidden transition-shadow hover:shadow-card",
      needsAttention ? "border-amber-200" : "border-slate-100"
    )}>
      <button className="w-full text-left p-4" onClick={() => setOpen(v => !v)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg }} />
            <div>
              <p className="text-sm font-bold text-slate-800">{bm.display_name}</p>
              <p className="text-[11px] text-slate-400">{bm.total_readings} readings</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {bm.latest_value !== null && (
              <div className="text-right">
                <p className="text-sm font-black text-slate-900">
                  {bm.latest_value} <span className="text-xs font-normal text-slate-400">{bm.unit}</span>
                </p>
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize", statusBadge)}>
                  {bm.latest_status}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <TrendIcon trend={bm.trend} change={bm.change_percent} />
              {bm.change_percent !== null && (
                <span className={cn("font-semibold text-[11px]",
                  bm.change_percent > 0 ? "text-red-500" : bm.change_percent < 0 ? "text-emerald-600" : "text-slate-400"
                )}>
                  {bm.change_percent > 0 ? "+" : ""}{bm.change_percent}%
                </span>
              )}
            </div>
            {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {bm.readings.length >= 2 ? (
            <div className="h-48 mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94A3B8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} domain={[yMin, yMax]} />
                  <Tooltip content={<CustomTooltip />} />
                  {refMin != null && refMax != null && (
                    <ReferenceArea y1={refMin} y2={refMax} fill="#D1FAE5" fillOpacity={0.4} />
                  )}
                  {refMin != null && <ReferenceLine y={refMin} stroke="#10B981" strokeDasharray="4 4" strokeWidth={1} />}
                  {refMax != null && <ReferenceLine y={refMax} stroke="#10B981" strokeDasharray="4 4" strokeWidth={1} />}
                  <Line
                    type="monotone" dataKey="value"
                    stroke={cfg} strokeWidth={2.5}
                    dot={{ fill: cfg, r: 4, strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              {refMin != null && refMax != null && (
                <p className="text-[10px] text-slate-400 text-center mt-1">
                  Green band = normal range ({refMin}–{refMax} {bm.unit})
                </p>
              )}
            </div>
          ) : (
            <div className="h-20 flex items-center justify-center">
              <p className="text-xs text-slate-400">Only 1 reading — upload more reports to see trends</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
            {[
              { label: "Latest", value: bm.latest_value !== null ? `${bm.latest_value} ${bm.unit}` : "—" },
              { label: "Normal Range", value: (refMin != null && refMax != null) ? `${refMin}–${refMax}` : "—" },
              { label: "Readings", value: `${bm.total_readings}` },
            ].map(({ label, value }) => (
              <div key={label} className="text-center bg-slate-50 rounded-xl p-2">
                <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
                <p className="text-xs font-bold text-slate-700">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Comparison Table ──────────────────────────────────────────────────────────

const TABLE_STATUS: Record<string, string> = {
  normal:   "text-emerald-700 bg-emerald-50",
  high:     "text-red-700 bg-red-50",
  low:      "text-amber-700 bg-amber-50",
  critical: "text-red-900 bg-red-100",
  unknown:  "text-slate-400 bg-slate-50",
};

function ComparisonTable({ biomarkers }: { biomarkers: Biomarker[] }) {
  if (biomarkers.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-card">
        <FlaskConical size={32} className="text-slate-200 mx-auto mb-3" />
        <p className="font-bold text-slate-600 mb-1">No biomarker data yet</p>
        <p className="text-sm text-slate-400 max-w-xs mx-auto">
          Upload lab reports to see values compared across test dates.
        </p>
      </div>
    );
  }

  // Collect all unique dates across all biomarkers, sort descending, take latest 6
  const allDates = Array.from(
    new Set(biomarkers.flatMap(bm => bm.readings.map(r => r.date.slice(0, 10))))
  ).sort((a, b) => b.localeCompare(a)).slice(0, 6);

  // Build date → biomarker → reading map
  const matrix: Record<string, Record<string, Reading & { unit: string }>> = {};
  biomarkers.forEach(bm => {
    bm.readings.forEach(r => {
      const d = r.date.slice(0, 10);
      if (!matrix[d]) matrix[d] = {};
      matrix[d][bm.name] = { ...r, unit: bm.unit };
    });
  });

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-card bg-white">
      <table className="min-w-[600px] w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="sticky left-0 bg-slate-50 text-left px-4 py-3 font-bold text-slate-600 min-w-[160px] z-10">
              Biomarker
            </th>
            {allDates.map(d => (
              <th key={d} className="px-3 py-3 font-bold text-slate-500 text-center whitespace-nowrap">
                {(() => { try { return format(parseISO(d), "MMM d"); } catch { return d; } })()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {biomarkers.map((bm, bmIdx) => (
            <tr
              key={bm.name}
              className={cn(
                "border-b border-slate-50 transition-colors hover:bg-slate-50/50",
                bmIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
              )}
            >
              <td className="sticky left-0 bg-inherit px-4 py-3 font-semibold text-slate-800 min-w-[160px] z-10">
                <div>
                  <p>{bm.display_name}</p>
                  <p className="text-[10px] text-slate-400 font-normal">{bm.unit}</p>
                </div>
              </td>
              {allDates.map((d, dIdx) => {
                const reading = matrix[d]?.[bm.name];
                const prevDate = allDates[dIdx + 1];
                const prevReading = prevDate ? matrix[prevDate]?.[bm.name] : undefined;
                const delta = reading && prevReading
                  ? reading.value - prevReading.value
                  : null;

                if (!reading) {
                  return (
                    <td key={d} className="px-3 py-3 text-center text-slate-300 font-medium">—</td>
                  );
                }

                return (
                  <td key={d} className="px-3 py-3 text-center">
                    <span className={cn(
                      "inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-bold",
                      TABLE_STATUS[reading.status] || TABLE_STATUS.unknown
                    )}>
                      <span>{reading.value}</span>
                    </span>
                    {delta !== null && (
                      <div className={cn(
                        "text-[10px] font-semibold mt-0.5 flex items-center justify-center gap-0.5",
                        delta > 0 ? "text-red-500" : delta < 0 ? "text-emerald-600" : "text-slate-400"
                      )}>
                        {delta > 0 ? <TrendingUp size={9} /> : delta < 0 ? <TrendingDown size={9} /> : <Minus size={9} />}
                        {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function BiomarkerPage() {
  const [months, setMonths] = useState(24);
  const [filter, setFilter] = useState<"all" | "abnormal">("all");
  const [activeTab, setActiveTab] = useState<"trends" | "comparison">("trends");

  const { data, isLoading } = useQuery({
    queryKey: ["biomarker-trends", months],
    queryFn: () => intelligenceApi.getBiomarkerTrends(months),
    staleTime: 5 * 60_000,
  });

  const biomarkers: Biomarker[] = data?.data?.biomarkers || [];
  const filtered = filter === "abnormal"
    ? biomarkers.filter(b => ["high", "low", "critical"].includes(b.latest_status))
    : biomarkers;

  const abnormalCount = biomarkers.filter(b => ["high", "low", "critical"].includes(b.latest_status)).length;

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <FlaskConical size={18} className="text-blue-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Biomarker Trends</h1>
        </div>
        <p className="text-sm text-slate-400 ml-[52px]">Cross-year longitudinal intelligence — all your lab values over time</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1.5 mb-5 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("trends")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === "trends"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Activity size={13} />
          Trends
        </button>
        <button
          onClick={() => setActiveTab("comparison")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === "comparison"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Table2 size={13} />
          Comparison Table
        </button>
      </div>

      {activeTab === "trends" && (
        <>
          {/* Controls */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex gap-1.5">
              {[
                { key: "all" as const, label: `All (${biomarkers.length})` },
                { key: "abnormal" as const, label: `Needs attention (${abnormalCount})` },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setFilter(opt.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                    filter === opt.key
                      ? "bg-brand-blue text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <select
              value={months}
              onChange={e => setMonths(Number(e.target.value))}
              className="hw-input py-1.5 text-xs w-36"
            >
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
              <option value={24}>Last 2 years</option>
              <option value={60}>Last 5 years</option>
            </select>
          </div>

          {/* Abnormal banner */}
          {abnormalCount > 0 && filter === "all" && (
            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-5">
              <AlertTriangle size={15} className="text-amber-500 shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                <strong>{abnormalCount}</strong> biomarker{abnormalCount > 1 ? "s are" : " is"} outside normal range. Click on them to see the trend.
              </p>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 skeleton rounded-2xl" />)}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && biomarkers.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-card">
              <FlaskConical size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="font-bold text-slate-600 mb-1">No biomarker data yet</p>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">
                Upload blood reports, urine tests, or any lab report — the AI will extract and track all values automatically.
              </p>
            </div>
          )}

          {/* Biomarker list */}
          {!isLoading && (
            <div className="space-y-3">
              {filtered.length === 0 && filter === "abnormal" && (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-card">
                  <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-2" />
                  <p className="font-bold text-emerald-700">All biomarkers are within normal range</p>
                </div>
              )}
              {/* Abnormal first */}
              {filtered
                .sort((a, b) => {
                  const aAbnormal = ["critical","high","low"].includes(a.latest_status) ? 1 : 0;
                  const bAbnormal = ["critical","high","low"].includes(b.latest_status) ? 1 : 0;
                  return bAbnormal - aAbnormal;
                })
                .map(bm => <BiomarkerChart key={bm.name} bm={bm} />)
              }
            </div>
          )}
        </>
      )}

      {activeTab === "comparison" && (
        <>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 skeleton rounded-2xl" />)}
            </div>
          ) : (
            <ComparisonTable biomarkers={biomarkers} />
          )}
        </>
      )}

      <p className="text-[11px] text-slate-400 text-center mt-6">
        Reference ranges are general guidelines. Optimal values vary by age, sex, and individual health factors. Always interpret with your doctor.
      </p>
    </div>
  );
}
