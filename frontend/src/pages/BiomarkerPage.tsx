import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";
import {
  FlaskConical, TrendingUp, TrendingDown, Minus, ChevronDown,
  ChevronUp, AlertTriangle, CheckCircle2, Activity,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { intelligenceApi } from "../services/api";
import { cn } from "../utils/cn";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Reading { date: string; value: number; status: string }
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

// ── Main page ─────────────────────────────────────────────────────────────────

export function BiomarkerPage() {
  const [months, setMonths] = useState(24);
  const [filter, setFilter] = useState<"all" | "abnormal">("all");

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
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <FlaskConical size={18} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Biomarker Trends</h1>
        </div>
        <p className="text-sm text-slate-400 ml-[52px]">Cross-year longitudinal intelligence — all your lab values over time</p>
      </div>

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

      <p className="text-[11px] text-slate-400 text-center mt-6">
        Reference ranges are general guidelines. Optimal values vary by age, sex, and individual health factors. Always interpret with your doctor.
      </p>
    </div>
  );
}
