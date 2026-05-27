import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Heart, Activity, Droplets, Zap, Flame, Shield, Brain, TrendingUp,
  Upload, MessageSquare, ChevronRight, Sparkles, AlertTriangle,
  BarChart3, FileText, ArrowUpRight, ArrowDownRight, Bell,
} from "lucide-react";
import { intelligenceApi, recordsApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { cn } from "../utils/cn";

/* ─── Score config ─────────────────────────────────────────────────── */
const SCORES = [
  { key: "heart_score",        label: "Heart",      Icon: Heart,       hex: "#EF4444", light: "#FEF2F2" },
  { key: "liver_score",        label: "Liver",      Icon: Activity,    hex: "#F59E0B", light: "#FFFBEB" },
  { key: "kidney_score",       label: "Kidney",     Icon: Droplets,    hex: "#3B82F6", light: "#EFF6FF" },
  { key: "metabolic_score",    label: "Metabolic",  Icon: Zap,         hex: "#8B5CF6", light: "#F5F3FF" },
  { key: "inflammation_score", label: "Inflam.",    Icon: Flame,       hex: "#F97316", light: "#FFF7ED" },
  { key: "preventive_score",   label: "Preventive", Icon: Shield,      hex: "#10B981", light: "#ECFDF5" },
  { key: "thyroid_score",      label: "Thyroid",    Icon: Brain,       hex: "#6366F1", light: "#EEF2FF" },
  { key: "blood_score",        label: "Blood",      Icon: TrendingUp,  hex: "#06B6D4", light: "#ECFEFF" },
];

const RISK_PILL: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border border-red-500/20",
  high:     "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  moderate: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  low:      "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
};

/* ─── SVG Score Ring ────────────────────────────────────────────────── */
function ScoreRing({ score, size, stroke, hex }: { score: number; size: number; stroke: number; hex: string }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(score, 100) / 100) * circ;
  const color = score >= 70 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-extrabold text-white" style={{ fontSize: size * 0.24 }}>{Math.round(score)}</span>
      </div>
    </div>
  );
}

/* ─── Small score card ──────────────────────────────────────────────── */
function MiniScoreRing({ score, hex, size = 52 }: { score: number; hex: string; size?: number }) {
  const r    = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(score, 100) / 100) * circ;
  const color = score >= 70 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={6} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-extrabold text-slate-800">{Math.round(score)}</span>
      </div>
    </div>
  );
}

/* ─── Dashboard ─────────────────────────────────────────────────────── */
export function Dashboard() {
  const { user } = useAuthStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.profile?.first_name || "there";
  const bloodGroup = user?.profile?.blood_group;

  const { data: scoresData, isLoading: scoresLoading } = useQuery({
    queryKey: ["health-scores"],
    queryFn: () => intelligenceApi.getHealthScores(2),
    staleTime: 10 * 60 * 1000,
  });

  const { data: alertsData } = useQuery({
    queryKey: ["alerts", false],
    queryFn: () => intelligenceApi.getAlerts(false),
    staleTime: 5 * 60 * 1000,
  });

  const { data: recordsData } = useQuery({
    queryKey: ["records-list"],
    queryFn: () => recordsApi.list({ page_size: 4 }),
    staleTime: 5 * 60 * 1000,
  });

  const scores  = scoresData?.data?.scores || [];
  const latest  = scores[0] || {};
  const prev    = scores[1] || {};
  const alerts  = alertsData?.data || [];
  const records = recordsData?.data?.records || [];
  const overall = Math.round(latest.overall_score || 0);

  const criticalAlerts = alerts.filter((a: any) => a.risk_level === "critical").length;
  const highAlerts     = alerts.filter((a: any) => a.risk_level === "high").length;

  const getDelta = (key: string) => {
    const k = key.replace("_score", "");
    const c = latest[k] ?? latest[key];
    const p = prev[k]   ?? prev[key];
    return c != null && p != null ? Math.round(c - p) : undefined;
  };

  const overallLabel =
    overall >= 80 ? "Excellent" :
    overall >= 65 ? "Good" :
    overall >= 50 ? "Fair" :
    overall > 0   ? "Needs attention" : null;

  return (
    <div className="min-h-full">
      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden px-8 pt-10 pb-8"
        style={{ background: "linear-gradient(135deg, #0A0F1E 0%, #0F172A 60%, #0D1B3E 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #0066FF, transparent)" }} />
        <div className="absolute -bottom-10 right-64 w-48 h-48 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #06B6D4, transparent)" }} />

        <div className="max-w-[1200px] flex items-center justify-between gap-8">
          {/* Left: greeting + stats */}
          <div className="flex-1">
            <p className="text-slate-400 text-sm font-medium mb-1">{greeting},</p>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">
              {firstName} 👋
            </h1>
            <p className="text-slate-400 text-sm mb-8">
              {overall > 0
                ? `Your overall health score is ${overallLabel?.toLowerCase()}. Here's your latest overview.`
                : "Upload your first lab report to unlock AI-powered health insights."}
            </p>

            {/* Stat pills */}
            <div className="flex flex-wrap gap-3">
              {bloodGroup && (
                <span className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold px-3 py-1.5 rounded-full">
                  🩸 {bloodGroup}
                </span>
              )}
              <span className={cn("flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full",
                criticalAlerts > 0
                  ? "bg-red-500/10 border border-red-500/20 text-red-400 animate-pulse-slow"
                  : "bg-white/5 border border-white/10 text-slate-400"
              )}>
                <Bell size={11} />
                {alerts.length} Alert{alerts.length !== 1 ? "s" : ""}
                {criticalAlerts > 0 && <span className="ml-1 text-red-300">({criticalAlerts} critical)</span>}
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-slate-400 text-xs font-bold px-3 py-1.5 rounded-full">
                <FileText size={11} />
                {records.length} Record{records.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Right: large score ring */}
          {!scoresLoading && overall > 0 ? (
            <div className="shrink-0 flex flex-col items-center gap-3">
              <div className="relative">
                <ScoreRing score={overall} size={148} stroke={12} hex="#0066FF" />
                {/* Glow */}
                <div className="absolute inset-0 rounded-full blur-2xl opacity-20"
                  style={{ background: overall >= 70 ? "#10B981" : overall >= 50 ? "#F59E0B" : "#EF4444" }} />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Overall Score</p>
                <p className={cn("text-sm font-bold mt-0.5",
                  overall >= 70 ? "text-emerald-400" : overall >= 50 ? "text-amber-400" : "text-red-400"
                )}>{overallLabel}</p>
              </div>
            </div>
          ) : scoresLoading ? (
            <div className="w-[148px] h-[148px] rounded-full shimmer-bg shrink-0 opacity-20" />
          ) : (
            <div className="shrink-0 flex flex-col items-center justify-center w-36 h-36 rounded-full border-2 border-dashed border-white/10">
              <BarChart3 size={28} className="text-white/20 mb-1" />
              <p className="text-[10px] text-white/30 text-center">No score yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="px-8 mt-6 pb-10 max-w-[1200px]">

        {/* Quick action cards (raised above hero) */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { to: "/upload",   Icon: Upload,        label: "Upload Record",   sub: "Lab, scan, prescription", bg: "bg-gradient-to-br from-brand-blue to-blue-700", glow: "shadow-blue-glow" },
            { to: "/chat",     Icon: MessageSquare, label: "Ask AI",          sub: "Query your health data",  bg: "bg-gradient-to-br from-purple-600 to-purple-800", glow: "" },
            { to: "/timeline", Icon: Activity,      label: "Health Timeline", sub: "Browse medical history",  bg: "bg-white", glow: "" },
            { to: "/alerts",   Icon: Bell,          label: "Health Alerts",   sub: `${alerts.length} active`, bg: "bg-white", glow: "" },
          ].map(({ to, Icon, label, sub, bg, glow }) => {
            const isDark = bg.includes("gradient");
            return (
              <Link key={to} to={to}
                className={cn(
                  "hw-card rounded-2xl p-5 flex items-center gap-4 group transition-all duration-200 hover:-translate-y-0.5",
                  isDark ? cn(bg, glow, "border-0 shadow-md") : bg
                )}
              >
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                  isDark ? "bg-white/15" : "bg-slate-100"
                )}>
                  <Icon size={20} className={isDark ? "text-white" : "text-slate-600"} />
                </div>
                <div className="min-w-0">
                  <p className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-800")}>{label}</p>
                  <p className={cn("text-xs mt-0.5", isDark ? "text-white/60" : "text-slate-400")}>{sub}</p>
                </div>
                <ChevronRight size={14} className={cn("ml-auto shrink-0 transition-transform group-hover:translate-x-0.5",
                  isDark ? "text-white/40" : "text-slate-300")} />
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* ── Organ Score Grid ──────────────────────────────── */}
          <div className="col-span-2">
            <div className="hw-card p-0 overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Organ Health Scores</h2>
                  <p className="text-xs text-slate-400 mt-0.5">AI-computed from your uploaded lab reports</p>
                </div>
                <Link to="/timeline"
                  className="flex items-center gap-1 text-xs font-semibold text-brand-blue hover:text-blue-700 transition-colors">
                  View timeline <ChevronRight size={13} />
                </Link>
              </div>

              <div className="p-6">
                {scoresLoading ? (
                  <div className="grid grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="skeleton h-32 rounded-2xl" />
                    ))}
                  </div>
                ) : overall === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <BarChart3 size={32} className="text-slate-300" />
                    </div>
                    <p className="font-bold text-slate-600 mb-1">No health scores yet</p>
                    <p className="text-sm text-slate-400 max-w-xs mx-auto mb-5">
                      Upload your first lab report to unlock AI-powered organ health scores
                    </p>
                    <Link to="/upload" className="btn-primary inline-flex">
                      <Upload size={14} /> Upload First Report
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-3">
                      {SCORES.map(({ key, label, Icon, hex, light }) => {
                        const k   = key.replace("_score", "");
                        const val = latest[k] ?? latest[key];
                        const delta = getDelta(key);
                        return (
                          <div key={key}
                            className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:shadow-card transition-all cursor-default group">
                            {/* Icon */}
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                              style={{ backgroundColor: light }}>
                              <Icon size={14} style={{ color: hex }} />
                            </div>
                            {/* Ring */}
                            {val != null ? (
                              <MiniScoreRing score={Math.round(val)} hex={hex} />
                            ) : (
                              <div className="w-[52px] h-[52px] rounded-full bg-slate-100 flex items-center justify-center">
                                <span className="text-xs text-slate-400">—</span>
                              </div>
                            )}
                            <p className="text-[11px] font-semibold text-slate-500 text-center leading-tight">{label}</p>
                            {delta !== undefined && (
                              <span className={cn(
                                "text-[10px] font-bold flex items-center gap-0.5",
                                delta >= 0 ? "text-emerald-500" : "text-red-500"
                              )}>
                                {delta >= 0 ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
                                {Math.abs(delta)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {latest.ai_narrative && (
                      <div className="mt-5 flex gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                        <Sparkles size={15} className="text-brand-blue shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-800 leading-relaxed">{latest.ai_narrative}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Panel ──────────────────────────────────── */}
          <div className="space-y-4">

            {/* Health Alerts */}
            <div className="hw-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                <div className="flex items-center gap-2">
                  <Bell size={15} className="text-brand-amber" />
                  <h3 className="text-sm font-bold text-slate-900">Health Alerts</h3>
                  {alerts.length > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center">
                      {alerts.length}
                    </span>
                  )}
                </div>
                <Link to="/alerts" className="text-xs font-semibold text-brand-blue hover:text-blue-700">
                  View all
                </Link>
              </div>

              {alerts.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Shield size={18} className="text-emerald-500" />
                  </div>
                  <p className="text-xs font-semibold text-slate-600">All clear</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">No active health alerts</p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {alerts.slice(0, 3).map((alert: any) => (
                    <div key={alert.id}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white transition-colors">
                      <AlertTriangle size={12} className={cn("shrink-0 mt-0.5",
                        alert.risk_level === "critical" ? "text-red-500" :
                        alert.risk_level === "high"     ? "text-orange-500" :
                        alert.risk_level === "moderate" ? "text-amber-500" : "text-emerald-500"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={cn("text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full", RISK_PILL[alert.risk_level])}>
                            {alert.risk_level}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 leading-snug">{alert.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Records */}
            <div className="hw-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                <h3 className="text-sm font-bold text-slate-900">Recent Records</h3>
                <Link to="/timeline" className="text-xs font-semibold text-brand-blue hover:text-blue-700">
                  View all
                </Link>
              </div>

              {records.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <FileText size={24} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No records yet</p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {records.slice(0, 4).map((rec: any) => (
                    <div key={rec.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={13} className="text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{rec.title}</p>
                        <p className="text-[10px] text-slate-400 capitalize mt-0.5">
                          {rec.record_type?.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Chat CTA */}
            <Link to="/chat"
              className="block hw-card p-5 overflow-hidden relative group hover:-translate-y-0.5 transition-transform"
              style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)" }}
            >
              <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/5" />
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center mb-3">
                <MessageSquare size={18} className="text-white" />
              </div>
              <p className="font-bold text-white text-sm">Ask AI Assistant</p>
              <p className="text-purple-200 text-xs mt-0.5">
                "Why is my creatinine rising?" →
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
