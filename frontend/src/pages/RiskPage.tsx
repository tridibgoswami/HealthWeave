import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert, RefreshCw, AlertTriangle, CheckCircle2,
  ChevronRight, Sparkles, Info, Stethoscope, Clock,
} from "lucide-react";
import { intelligenceApi } from "../services/api";
import { cn } from "../utils/cn";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RiskPrediction {
  id: string;
  condition: string;
  title: string;
  risk_level: "low" | "moderate" | "high" | "critical";
  risk_score: number | null;
  confidence: number | null;
  time_horizon: string | null;
  summary: string | null;
  key_indicators: string[];
  recommended_actions: string[];
  consult_specialist: string | null;
}

// ── Risk gauge ────────────────────────────────────────────────────────────────

const RISK_CONFIG = {
  critical: { color: "#EF4444", bg: "bg-red-50",    border: "border-red-200",    badge: "bg-red-100 text-red-700",       label: "Critical Risk" },
  high:     { color: "#F97316", bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", label: "High Risk" },
  moderate: { color: "#F59E0B", bg: "bg-amber-50",  border: "border-amber-200",  badge: "bg-amber-100 text-amber-700",   label: "Moderate Risk" },
  low:      { color: "#10B981", bg: "bg-emerald-50",border: "border-emerald-200",badge: "bg-emerald-100 text-emerald-700", label: "Low Risk" },
};

function RiskGauge({ score, level }: { score: number | null; level: string }) {
  const cfg = RISK_CONFIG[level as keyof typeof RISK_CONFIG] || RISK_CONFIG.low;
  const pct = score !== null ? Math.round(score * 100) : 0;
  const r = 28, circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ * 0.75; // 3/4 circle gauge

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-16">
        <svg width={64} height={64} viewBox="0 0 64 64" className="absolute inset-0">
          <circle cx={32} cy={32} r={r} fill="none" stroke="rgba(0,0,0,0.06)"
            strokeWidth={6} strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
            strokeLinecap="round" transform="rotate(135 32 32)" />
          <circle cx={32} cy={32} r={r} fill="none" stroke={cfg.color}
            strokeWidth={6} strokeDasharray={`${fill} ${circ}`}
            strokeLinecap="round" transform="rotate(135 32 32)" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-black" style={{ color: cfg.color }}>
            {score !== null ? `${pct}%` : "—"}
          </span>
        </div>
      </div>
      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", cfg.badge)}>
        {cfg.label}
      </span>
    </div>
  );
}

function RiskCard({ pred }: { pred: RiskPrediction }) {
  const [open, setOpen] = React.useState(false);
  const cfg = RISK_CONFIG[pred.risk_level] || RISK_CONFIG.low;

  return (
    <div className={cn("border rounded-2xl overflow-hidden", cfg.bg, cfg.border)}>
      <button className="w-full text-left p-4" onClick={() => setOpen(v => !v)}>
        <div className="flex items-start gap-4">
          <RiskGauge score={pred.risk_score} level={pred.risk_level} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-sm font-bold text-slate-800">{pred.title}</p>
              <ChevronRight size={14} className={cn("text-slate-400 transition-transform shrink-0", open && "rotate-90")} />
            </div>
            {pred.time_horizon && (
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1.5">
                <Clock size={10} /> <span>Risk horizon: {pred.time_horizon}</span>
              </div>
            )}
            {pred.summary && (
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{pred.summary}</p>
            )}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-200/80 pt-3">
          {pred.key_indicators?.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Key Risk Indicators</p>
              <div className="space-y-1">
                {pred.key_indicators.map((ind, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: cfg.color }} />
                    {typeof ind === "string" ? ind : JSON.stringify(ind)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {pred.recommended_actions?.length > 0 && (
            <div className="bg-white/70 border border-slate-100 rounded-xl p-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Recommended Actions</p>
              <div className="space-y-1.5">
                {pred.recommended_actions.map((action, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                    <CheckCircle2 size={11} className="text-emerald-500 shrink-0 mt-0.5" />
                    {action}
                  </div>
                ))}
              </div>
            </div>
          )}

          {pred.consult_specialist && (
            <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3">
              <Stethoscope size={13} className="text-blue-600 shrink-0" />
              <p className="text-xs text-blue-800 font-medium">Consult: <strong>{pred.consult_specialist}</strong></p>
            </div>
          )}

          {pred.confidence !== null && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-medium">AI Confidence</span>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-blue"
                  style={{ width: `${Math.round((pred.confidence ?? 0) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 w-8 text-right">
                {Math.round((pred.confidence ?? 0) * 100)}%
              </span>
            </div>
          )}

          <p className="text-[10px] text-slate-400 flex items-start gap-1">
            <Info size={10} className="shrink-0 mt-0.5" />
            Risk scores are AI-generated indicators only. Not a medical diagnosis. Consult your doctor.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function RiskPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["risk-predictions"],
    queryFn: () => intelligenceApi.getRiskPredictions(),
    staleTime: 10 * 60_000,
  });

  const runMut = useMutation({
    mutationFn: () => intelligenceApi.runRiskPredictions(),
    onSuccess: () => {
      toast.success("Risk analysis started — results will appear shortly");
      setTimeout(() => qc.invalidateQueries({ queryKey: ["risk-predictions"] }), 5000);
    },
    onError: () => toast.error("Failed to run risk analysis"),
  });

  const predictions: RiskPrediction[] = data?.data?.predictions || [];

  const critical = predictions.filter(p => p.risk_level === "critical" || p.risk_level === "high");
  const moderate = predictions.filter(p => p.risk_level === "moderate");
  const low      = predictions.filter(p => p.risk_level === "low");

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <ShieldAlert size={18} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Preventive Risk Engine</h1>
          </div>
          <button
            onClick={() => runMut.mutate()}
            disabled={runMut.isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-300 disabled:opacity-50"
          >
            <RefreshCw size={12} className={runMut.isPending ? "animate-spin" : ""} />
            {runMut.isPending ? "Analysing…" : "Run Analysis"}
          </button>
        </div>
        <p className="text-sm text-slate-400 ml-[52px]">
          AI-powered disease risk predictions based on your longitudinal health data
        </p>
      </div>

      {/* Summary bar */}
      {predictions.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "High/Critical",  count: critical.length, color: "text-red-600",    bg: "bg-red-50 border-red-100" },
            { label: "Moderate Risk",  count: moderate.length, color: "text-amber-600",  bg: "bg-amber-50 border-amber-100" },
            { label: "Low Risk",       count: low.length,      color: "text-emerald-600",bg: "bg-emerald-50 border-emerald-100" },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className={cn("rounded-2xl border p-3 text-center", bg)}>
              <p className={cn("text-2xl font-black", color)}>{count}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 skeleton rounded-2xl" />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && predictions.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-card">
          <ShieldAlert size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="font-bold text-slate-600 mb-1">No risk predictions yet</p>
          <p className="text-sm text-slate-400 max-w-sm mx-auto mb-5">
            Click "Run Analysis" to generate AI-powered disease risk predictions from your health data. Works best with uploaded lab reports and biomarker history.
          </p>
          <button onClick={() => runMut.mutate()} disabled={runMut.isPending} className="btn-primary">
            <Sparkles size={13} /> Run Risk Analysis
          </button>
        </div>
      )}

      {/* Predictions grouped by severity */}
      {!isLoading && predictions.length > 0 && (
        <div className="space-y-6">
          {critical.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-red-500" />
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Requires Immediate Attention</p>
              </div>
              <div className="space-y-3">
                {critical.map(p => <RiskCard key={p.id} pred={p} />)}
              </div>
            </div>
          )}
          {moderate.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-amber-500" />
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Monitor Closely</p>
              </div>
              <div className="space-y-3">
                {moderate.map(p => <RiskCard key={p.id} pred={p} />)}
              </div>
            </div>
          )}
          {low.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Low Risk — Maintain Habits</p>
              </div>
              <div className="space-y-3">
                {low.map(p => <RiskCard key={p.id} pred={p} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-slate-400 text-center mt-6 leading-relaxed">
        Risk predictions are AI-generated indicators only and are <strong>not medical diagnoses</strong>.
        Results depend on completeness of your uploaded health records.
        Always consult a licensed healthcare professional before making health decisions.
      </p>
    </div>
  );
}
