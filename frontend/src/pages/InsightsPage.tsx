import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles,
  RefreshCw, ChevronDown, ChevronUp, Pill, Activity, FlaskConical,
  Heart, Zap, ShieldCheck, Info, BarChart3, Link2,
} from "lucide-react";
import { intelligenceApi } from "../services/api";
import { cn } from "../utils/cn";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CorrelationFinding {
  id: string;
  finding_type: string;
  title: string;
  description: string;
  biomarkers_involved: string[];
  significance: "low" | "moderate" | "high" | "critical";
  trend_direction: "improving" | "stable" | "worsening" | "fluctuating";
  change_summary: string;
  preventive_suggestion: string;
  confidence: number;
  priority: number;
  medicine?: string;
  correlation_type?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const SIG_CONFIG = {
  critical:  { bg: "bg-red-50",     border: "border-red-200",     badge: "bg-red-100 text-red-700",     dot: "bg-red-500",     label: "Critical" },
  high:      { bg: "bg-amber-50",   border: "border-amber-200",   badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500",  label: "High" },
  moderate:  { bg: "bg-blue-50",    border: "border-blue-200",    badge: "bg-blue-100 text-blue-700",   dot: "bg-blue-500",   label: "Moderate" },
  low:       { bg: "bg-slate-50",   border: "border-slate-200",   badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400",  label: "Low" },
};

const TREND_ICON: Record<string, React.ReactNode> = {
  worsening:   <TrendingDown size={13} className="text-red-500" />,
  improving:   <TrendingUp size={13} className="text-emerald-500" />,
  fluctuating: <Activity size={13} className="text-amber-500" />,
  stable:      <Minus size={13} className="text-slate-400" />,
};

const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  biomarker_correlation:       { icon: FlaskConical, label: "Biomarker Trend",         color: "text-blue-600 bg-blue-100" },
  metabolic_syndrome_risk:     { icon: Heart,        label: "Metabolic Risk",           color: "text-red-600 bg-red-100" },
  disease_progression:         { icon: Activity,     label: "Disease Progression",      color: "text-amber-600 bg-amber-100" },
  medicine_biomarker_correlation: { icon: Pill,      label: "Medicine Correlation",     color: "text-purple-600 bg-purple-100" },
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", pct >= 80 ? "bg-emerald-400" : pct >= 60 ? "bg-amber-400" : "bg-slate-300")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-400 font-medium w-7 text-right">{pct}%</span>
    </div>
  );
}

function FindingCard({ finding }: { finding: CorrelationFinding }) {
  const [open, setOpen] = useState(false);
  const sig = SIG_CONFIG[finding.significance] || SIG_CONFIG.low;
  const type = TYPE_CONFIG[finding.finding_type] || { icon: Brain, label: "Finding", color: "text-slate-600 bg-slate-100" };
  const TypeIcon = type.icon;

  return (
    <div className={cn("border rounded-2xl overflow-hidden transition-shadow hover:shadow-card", sig.bg, sig.border)}>
      <button className="w-full text-left p-4" onClick={() => setOpen(v => !v)}>
        <div className="flex items-start gap-3">
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5", type.color)}>
            <TypeIcon size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm font-bold text-slate-800 leading-snug">{finding.title}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                {TREND_ICON[finding.trend_direction]}
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", sig.badge)}>
                  {sig.label}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{finding.description}</p>
            {finding.biomarkers_involved?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {finding.biomarkers_involved.slice(0, 4).map(b => (
                  <span key={b} className="text-[10px] bg-white/70 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-medium">
                    {b.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </div>
          {open ? <ChevronUp size={14} className="text-slate-400 shrink-0 mt-1" /> : <ChevronDown size={14} className="text-slate-400 shrink-0 mt-1" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-200/80 pt-3">
          {finding.change_summary && (
            <div className="bg-white/80 border border-slate-100 rounded-xl p-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Trend Summary</p>
              <p className="text-xs text-slate-700">{finding.change_summary}</p>
            </div>
          )}
          <div className="bg-white/80 border border-emerald-100 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck size={11} className="text-emerald-600" />
              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Preventive Action</p>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">{finding.preventive_suggestion}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 mb-1 font-medium">Analysis confidence</p>
            <ConfidenceBar value={finding.confidence} />
          </div>
          <p className="text-[10px] text-slate-400 flex items-start gap-1">
            <Info size={10} className="shrink-0 mt-0.5" />
            This is a risk indicator, not a medical diagnosis. Always consult a qualified healthcare professional.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, label, color }: { score: number | null; label: string; color: string }) {
  const s = score ?? 0;
  const r = 22, circ = 2 * Math.PI * r, fill = (s / 100) * circ;
  const textColor = s >= 80 ? "text-emerald-600" : s >= 60 ? "text-amber-500" : "text-red-500";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg width={56} height={56} style={{ transform: "rotate(-90deg)" }} className="absolute inset-0">
          <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth={5} />
          <circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={5}
            strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-sm font-black", score === null ? "text-slate-300" : textColor)}>
            {score === null ? "—" : s}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 font-medium text-center leading-tight">{label}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function InsightsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "correlations" | "progression" | "medicine">("overview");

  const { data: scoresData, isLoading: scoresLoading } = useQuery({
    queryKey: ["health-scores"],
    queryFn: () => intelligenceApi.getHealthScores(1),
    staleTime: 5 * 60_000,
  });

  const { data: correlationsData, isLoading: corrLoading } = useQuery({
    queryKey: ["correlations"],
    queryFn: () => intelligenceApi.getCorrelations(),
    staleTime: 10 * 60_000,
  });

  const { data: alertsData } = useQuery({
    queryKey: ["alerts", false],
    queryFn: () => intelligenceApi.getAlerts(false),
    staleTime: 5 * 60_000,
  });

  const computeMut = useMutation({
    mutationFn: () => intelligenceApi.computeScores(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["health-scores"] }); toast.success("Health scores updated!"); },
    onError: () => toast.error("Failed to compute scores"),
  });

  const corrMut = useMutation({
    mutationFn: () => intelligenceApi.runCorrelations(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["correlations"] }); toast.success("Analysis complete!"); },
    onError: () => toast.error("Failed to run analysis"),
  });

  const latestScore = (scoresData?.data?.scores || [])[0];
  const findings: CorrelationFinding[] = correlationsData?.data || [];
  const alerts = alertsData?.data || [];

  const biomarkerFindings = findings.filter(f => f.finding_type === "biomarker_correlation" || f.finding_type === "metabolic_syndrome_risk");
  const progressionFindings = findings.filter(f => f.finding_type === "disease_progression");
  const medicineFindings = findings.filter(f => f.finding_type === "medicine_biomarker_correlation");
  const criticalCount = findings.filter(f => f.significance === "critical" || f.significance === "high").length;

  const SCORES = [
    { key: "heart",     label: "Heart",     color: "#EF4444" },
    { key: "liver",     label: "Liver",     color: "#F59E0B" },
    { key: "kidney",    label: "Kidney",    color: "#3B82F6" },
    { key: "metabolic", label: "Metabolic", color: "#8B5CF6" },
    { key: "thyroid",   label: "Thyroid",   color: "#06B6D4" },
    { key: "blood",     label: "Blood",     color: "#EC4899" },
    { key: "inflammation", label: "Inflam.", color: "#F97316" },
    { key: "mental_wellness", label: "Mental", color: "#10B981" },
  ];

  const TABS = [
    { key: "overview",     label: "Overview",         count: null },
    { key: "correlations", label: "Biomarker Trends",  count: biomarkerFindings.length },
    { key: "progression",  label: "Disease Patterns",  count: progressionFindings.length },
    { key: "medicine",     label: "Medicine Effects",  count: medicineFindings.length },
  ] as const;

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Brain size={18} className="text-purple-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Health Intelligence</h1>
          </div>
          <button
            onClick={() => corrMut.mutate()}
            disabled={corrMut.isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all disabled:opacity-50"
          >
            <RefreshCw size={12} className={corrMut.isPending ? "animate-spin" : ""} />
            {corrMut.isPending ? "Analysing…" : "Run Analysis"}
          </button>
        </div>
        <p className="text-sm text-slate-400 ml-[52px]">AI-powered longitudinal patterns, risk indicators and disease intelligence</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all",
              activeTab === tab.key
                ? "bg-white text-slate-800 shadow-card"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className={cn(
                "text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-1",
                activeTab === tab.key ? "bg-brand-blue text-white" : "bg-slate-200 text-slate-500"
              )}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Health Scores */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-0.5">Overall Health Score</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-black text-slate-900">
                    {scoresLoading ? "—" : (latestScore?.overall_score ?? "—")}
                  </p>
                  <span className="text-sm text-slate-400 font-medium">/ 100</span>
                </div>
              </div>
              <button
                onClick={() => computeMut.mutate()}
                disabled={computeMut.isPending}
                className="text-xs px-3 py-1.5 bg-brand-blue text-white rounded-xl font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                <Zap size={11} />
                {computeMut.isPending ? "Computing…" : "Recompute"}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {SCORES.map(({ key, label, color }) => (
                <ScoreRing key={key} score={latestScore ? (latestScore as any)[key] : null} label={label} color={color} />
              ))}
            </div>
            {!latestScore && !scoresLoading && (
              <p className="text-xs text-slate-400 text-center mt-4">
                No score yet — upload health records first, then click Recompute
              </p>
            )}
          </div>

          {/* Alert summary */}
          {alerts.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={15} className="text-amber-500" />
                <p className="text-sm font-bold text-slate-800">{alerts.length} Active Risk Alert{alerts.length > 1 ? "s" : ""}</p>
              </div>
              <div className="space-y-2">
                {alerts.slice(0, 3).map((a: any) => (
                  <div key={a.id} className={cn(
                    "flex items-start gap-2.5 p-3 rounded-xl text-xs",
                    a.risk_level === "critical" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                  )}>
                    <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                    <span className="font-medium leading-snug">{a.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Findings summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Biomarker Patterns", count: biomarkerFindings.length, icon: BarChart3, color: "text-blue-600 bg-blue-50 border-blue-100" },
              { label: "Disease Patterns",   count: progressionFindings.length, icon: Activity,  color: "text-amber-600 bg-amber-50 border-amber-100" },
              { label: "Medicine Effects",   count: medicineFindings.length,   icon: Pill,       color: "text-purple-600 bg-purple-50 border-purple-100" },
            ].map(({ label, count, icon: Icon, color }) => (
              <div key={label} className={cn("rounded-2xl border p-4 text-center", color)}>
                <Icon size={20} className="mx-auto mb-2 opacity-80" />
                <p className="text-2xl font-black">{count}</p>
                <p className="text-[11px] font-medium mt-0.5 opacity-80 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {criticalCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">{criticalCount} high-priority finding{criticalCount > 1 ? "s" : ""} need attention</p>
                <p className="text-xs text-red-600 mt-0.5">Review the tabs above and discuss with your doctor.</p>
              </div>
            </div>
          )}

          {findings.length === 0 && !corrLoading && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-card p-10 text-center">
              <Brain size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="font-bold text-slate-600 mb-1">No analysis yet</p>
              <p className="text-sm text-slate-400 mb-4">Click "Run Analysis" to generate AI-powered insights from your health records</p>
              <button onClick={() => corrMut.mutate()} disabled={corrMut.isPending} className="btn-primary">
                <Sparkles size={13} /> Run Analysis
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── BIOMARKER CORRELATIONS TAB ── */}
      {activeTab === "correlations" && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 flex items-start gap-2.5 mb-4">
            <Sparkles size={13} className="text-brand-blue shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>Longitudinal biomarker intelligence</strong> — AI analyses trends across all your lab reports over time. Findings show patterns, not diagnoses.
            </p>
          </div>
          {corrLoading && (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-24 skeleton rounded-2xl" />)}
            </div>
          )}
          {!corrLoading && biomarkerFindings.length === 0 && (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-card">
              <FlaskConical size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No biomarker patterns found yet. Upload lab reports and run analysis.</p>
            </div>
          )}
          {biomarkerFindings.sort((a,b) => b.priority - a.priority).map((f, i) => (
            <FindingCard key={f.id || i} finding={f} />
          ))}
        </div>
      )}

      {/* ── DISEASE PROGRESSION TAB ── */}
      {activeTab === "progression" && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3.5 flex items-start gap-2.5 mb-4">
            <Activity size={13} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>Disease progression analysis</strong> — tracks recurring conditions, ICD-10 patterns, and chronic disease trajectories across your full medical history.
            </p>
          </div>
          {!corrLoading && progressionFindings.length === 0 && (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-card">
              <Activity size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No recurring disease patterns found. Upload discharge summaries and consultation records for best results.</p>
            </div>
          )}
          {progressionFindings.sort((a,b) => b.priority - a.priority).map((f, i) => (
            <FindingCard key={f.id || i} finding={f} />
          ))}
        </div>
      )}

      {/* ── MEDICINE EFFECTS TAB ── */}
      {activeTab === "medicine" && (
        <div className="space-y-3">
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3.5 flex items-start gap-2.5 mb-4">
            <Link2 size={13} className="text-purple-600 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>Medicine intelligence</strong> — correlates your medications with biomarker changes to identify therapeutic effects, side effects, and dependency patterns.
            </p>
          </div>
          {!corrLoading && medicineFindings.length === 0 && (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-card">
              <Pill size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No medicine-biomarker correlations yet. Upload prescriptions and lab reports together for best results.</p>
            </div>
          )}
          {medicineFindings.sort((a,b) => b.priority - a.priority).map((f, i) => (
            <FindingCard key={f.id || i} finding={f} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-400 text-center mt-6 leading-relaxed">
        All findings are AI-generated risk indicators only and are <strong>not medical diagnoses</strong>.
        Always consult a licensed healthcare professional before making health decisions.
      </p>
    </div>
  );
}
