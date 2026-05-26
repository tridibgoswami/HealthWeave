import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Heart, Activity, Droplets, Zap, Flame, Shield, Brain, TrendingUp,
  Bell, Upload, MessageSquare, ChevronRight, Sparkles, AlertTriangle,
  BarChart3, FileText, ArrowUp, ArrowDown,
} from "lucide-react";
import { intelligenceApi, recordsApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { cn } from "../utils/cn";

const SCORE_CONFIG = [
  { key: "heart_score",       label: "Heart",      Icon: Heart,      color: "#EF4444", light: "#FEF2F2" },
  { key: "liver_score",       label: "Liver",      Icon: Activity,   color: "#F59E0B", light: "#FFFBEB" },
  { key: "kidney_score",      label: "Kidney",     Icon: Droplets,   color: "#3B82F6", light: "#EFF6FF" },
  { key: "metabolic_score",   label: "Metabolic",  Icon: Zap,        color: "#8B5CF6", light: "#F5F3FF" },
  { key: "inflammation_score",label: "Inflam.",    Icon: Flame,      color: "#F97316", light: "#FFF7ED" },
  { key: "preventive_score",  label: "Preventive", Icon: Shield,     color: "#10B981", light: "#ECFDF5" },
  { key: "thyroid_score",     label: "Thyroid",    Icon: Brain,      color: "#6366F1", light: "#EEF2FF" },
  { key: "blood_score",       label: "Blood",      Icon: TrendingUp, color: "#06B6D4", light: "#ECFEFF" },
];

const RISK_STYLE: Record<string, string> = {
  low:      "bg-emerald-50 border-emerald-100 text-emerald-700",
  moderate: "bg-amber-50  border-amber-100  text-amber-700",
  high:     "bg-orange-50 border-orange-100 text-orange-700",
  critical: "bg-red-50    border-red-100    text-red-700",
};

const RISK_BADGE: Record<string, string> = {
  low:      "bg-emerald-100 text-emerald-700",
  moderate: "bg-amber-100  text-amber-700",
  high:     "bg-orange-100 text-orange-700",
  critical: "bg-red-100    text-red-700",
};

function ScoreRing({ score, color, size = 52 }: { score: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-gray-800">{Math.round(score)}</span>
      </div>
    </div>
  );
}

function ScoreCard({ label, score, delta, color, light, Icon }: {
  label: string; score: number | null; delta?: number; color: string; light: string; Icon: React.ElementType;
}) {
  const val = score ?? 0;
  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-shadow">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: light }}>
        <Icon size={14} style={{ color }} />
      </div>
      {score !== null ? (
        <ScoreRing score={val} color={color} size={52} />
      ) : (
        <div className="w-[52px] h-[52px] rounded-full bg-gray-100 flex items-center justify-center">
          <span className="text-xs text-gray-400">—</span>
        </div>
      )}
      <p className="text-[11px] font-semibold text-gray-600 text-center leading-tight">{label}</p>
      {delta !== undefined && (
        <span className={cn("text-[10px] font-bold flex items-center gap-0.5",
          delta >= 0 ? "text-emerald-600" : "text-red-500"
        )}>
          {delta >= 0 ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
          {Math.abs(delta)}
        </span>
      )}
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuthStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.profile?.first_name || "there";

  const { data: scoresData, isLoading: scoresLoading } = useQuery({
    queryKey: ["health-scores"],
    queryFn: () => intelligenceApi.getHealthScores(2),
    staleTime: 10 * 60 * 1000,
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ["alerts", false],
    queryFn: () => intelligenceApi.getAlerts(false),
    staleTime: 5 * 60 * 1000,
  });

  const { data: recordsData } = useQuery({
    queryKey: ["records-list"],
    queryFn: () => recordsApi.list({ page_size: 3 }),
    staleTime: 5 * 60 * 1000,
  });

  const scores      = scoresData?.data?.scores || [];
  const latest      = scores[0] || {};
  const previous    = scores[1] || {};
  const alerts      = alertsData?.data || [];
  const topAlerts   = alerts.slice(0, 3);
  const records     = recordsData?.data?.records || [];
  const overall     = Math.round(latest.overall_score || 0);
  const criticalCnt = alerts.filter((a: any) => a.risk_level === "critical").length;
  const highCnt     = alerts.filter((a: any) => a.risk_level === "high").length;

  const getDelta = (key: string) => {
    const k = key.replace("_score", "");
    const c = latest[k] ?? latest[key];
    const p = previous[k] ?? previous[key];
    return c != null && p != null ? Math.round(c - p) : undefined;
  };

  const overallColor = overall >= 70 ? "#10B981" : overall >= 50 ? "#F59E0B" : overall > 0 ? "#EF4444" : "#CBD5E1";
  const overallLabel = overall >= 70 ? "Excellent" : overall >= 50 ? "Fair" : overall > 0 ? "Needs attention" : "No data yet";

  return (
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{greeting},</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">{firstName} 👋</h1>
          <p className="text-sm text-gray-400 mt-1">Here's your health overview for today</p>
        </div>
        <Link to="/upload"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm">
          <Upload size={15} /> Upload Record
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* Overall Score */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="relative shrink-0">
            {scoresLoading ? (
              <div className="w-14 h-14 rounded-full bg-gray-100 animate-pulse" />
            ) : (
              <ScoreRing score={overall} color={overallColor} size={56} />
            )}
          </div>
          <div>
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Overall Score</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{overall || "—"}<span className="text-xs text-gray-400 font-normal">/100</span></p>
            <p className="text-xs font-medium mt-0.5"
              style={{ color: overallColor }}>{overallLabel}</p>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Active Alerts</p>
          <p className="text-2xl font-bold text-gray-900">{alertsLoading ? "—" : alerts.length}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {criticalCnt > 0 && (
              <span className="text-[10px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">{criticalCnt} critical</span>
            )}
            {highCnt > 0 && (
              <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full">{highCnt} high</span>
            )}
            {alerts.length === 0 && !alertsLoading && (
              <span className="text-[10px] text-emerald-600 font-semibold">All clear ✓</span>
            )}
          </div>
        </div>

        {/* Records */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Records</p>
          <p className="text-2xl font-bold text-gray-900">{records.length}</p>
          <p className="text-xs text-gray-400 mt-2">Lab reports, scans, prescriptions</p>
        </div>

        {/* Quick upload CTA */}
        <Link to="/chat"
          className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-5 flex flex-col justify-between hover:from-purple-700 hover:to-purple-800 transition-all shadow-sm group">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <MessageSquare size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">Ask AI Assistant</p>
            <p className="text-xs text-purple-200 mt-0.5 flex items-center gap-1">
              Query your health data <ChevronRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        </Link>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Organ scores - 2 cols */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div>
              <h2 className="font-bold text-gray-900">Organ Health Scores</h2>
              <p className="text-xs text-gray-400 mt-0.5">AI-computed from your uploaded lab reports</p>
            </div>
            <Link to="/timeline" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Full timeline <ChevronRight size={13} />
            </Link>
          </div>

          <div className="p-6">
            {scoresLoading ? (
              <div className="grid grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : overall === 0 ? (
              <div className="text-center py-14">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 size={28} className="text-gray-300" />
                </div>
                <p className="font-semibold text-gray-700 mb-1">No health scores yet</p>
                <p className="text-sm text-gray-400 max-w-xs mx-auto">Upload your first lab report to unlock AI-powered organ health scores and insights.</p>
                <Link to="/upload"
                  className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                  <Upload size={14} /> Upload First Report
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-3">
                  {SCORE_CONFIG.map(({ key, label, Icon, color, light }) => {
                    const k = key.replace("_score", "");
                    const val = latest[k] ?? latest[key];
                    return (
                      <ScoreCard
                        key={key}
                        label={label}
                        score={val != null ? Math.round(val) : null}
                        delta={getDelta(key)}
                        color={color}
                        light={light}
                        Icon={Icon}
                      />
                    );
                  })}
                </div>
                {latest.ai_narrative && (
                  <div className="mt-5 flex gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <Sparkles size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800 leading-relaxed">{latest.ai_narrative}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-1">
              {[
                { to: "/upload",   Icon: Upload,        label: "Upload Records",   sub: "Add lab, scan or prescription", hov: "hover:bg-blue-50",   icBg: "bg-blue-100",   icC: "text-blue-600" },
                { to: "/chat",     Icon: MessageSquare, label: "AI Assistant",     sub: "Ask about your health",         hov: "hover:bg-purple-50", icBg: "bg-purple-100", icC: "text-purple-600" },
                { to: "/timeline", Icon: Activity,      label: "Health Timeline",  sub: "Browse medical history",        hov: "hover:bg-emerald-50",icBg: "bg-emerald-100",icC: "text-emerald-600" },
                { to: "/alerts",   Icon: Bell,          label: "Health Alerts",    sub: `${alerts.length} active`,       hov: "hover:bg-amber-50",  icBg: "bg-amber-100",  icC: "text-amber-600" },
              ].map(({ to, Icon, label, sub, hov, icBg, icC }) => (
                <Link key={to} to={to}
                  className={cn("flex items-center gap-3 p-3 rounded-xl transition-colors group", hov)}>
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", icBg)}>
                    <Icon size={14} className={icC} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{label}</p>
                    <p className="text-xs text-gray-400">{sub}</p>
                  </div>
                  <ChevronRight size={13} className="text-gray-300 group-hover:text-gray-400 shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          {/* Alerts preview */}
          {topAlerts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">Health Alerts</h3>
                <Link to="/alerts" className="text-xs text-blue-600 font-semibold hover:text-blue-700">View all</Link>
              </div>
              <div className="space-y-2">
                {topAlerts.map((alert: any) => (
                  <div key={alert.id}
                    className={cn("rounded-xl p-3 border text-xs", RISK_STYLE[alert.risk_level] || RISK_STYLE.moderate)}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                      <div>
                        <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full mr-1.5", RISK_BADGE[alert.risk_level])}>
                          {alert.risk_level}
                        </span>
                        <span className="font-semibold">{alert.title}</span>
                        {alert.summary && <p className="mt-0.5 opacity-75">{alert.summary}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent records */}
          {records.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">Recent Records</h3>
                <Link to="/timeline" className="text-xs text-blue-600 font-semibold hover:text-blue-700">View all</Link>
              </div>
              <div className="space-y-2">
                {records.map((rec: any) => (
                  <div key={rec.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <FileText size={13} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{rec.title}</p>
                      <p className="text-[10px] text-gray-400">{rec.record_type?.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-[11px] text-center text-gray-300 mt-8">
        HealthWeave AI provides health intelligence for informational purposes only. Always consult a qualified healthcare professional.
      </p>
    </div>
  );
}
