/**
 * HealthWeave – Main Dashboard Page
 * Health scores, alerts, quick upload, and timeline preview.
 */

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Heart,
  Activity,
  Droplets,
  Zap,
  Flame,
  Shield,
  Brain,
  TrendingUp,
  Bell,
  Upload,
  MessageSquare,
  ChevronRight,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { intelligenceApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { HealthScoreCard } from "../components/dashboard/HealthScoreCard";
import { cn } from "../utils/cn";

const SCORE_CONFIG = [
  { key: "heart_score", label: "Heart", icon: <Heart size={16} />, color: "text-red-500", bg: "bg-red-50" },
  { key: "liver_score", label: "Liver", icon: <Activity size={16} />, color: "text-amber-500", bg: "bg-amber-50" },
  { key: "kidney_score", label: "Kidney", icon: <Droplets size={16} />, color: "text-blue-500", bg: "bg-blue-50" },
  { key: "metabolic_score", label: "Metabolic", icon: <Zap size={16} />, color: "text-purple-500", bg: "bg-purple-50" },
  { key: "inflammation_score", label: "Inflammation", icon: <Flame size={16} />, color: "text-orange-500", bg: "bg-orange-50" },
  { key: "preventive_score", label: "Preventive", icon: <Shield size={16} />, color: "text-emerald-500", bg: "bg-emerald-50" },
  { key: "thyroid_score", label: "Thyroid", icon: <Brain size={16} />, color: "text-indigo-500", bg: "bg-indigo-50" },
  { key: "blood_score", label: "Blood", icon: <TrendingUp size={16} />, color: "text-cyan-500", bg: "bg-cyan-50" },
];

const RISK_COLORS: Record<string, string> = {
  low: "bg-emerald-50 border-emerald-200 text-emerald-800",
  moderate: "bg-amber-50 border-amber-200 text-amber-800",
  high: "bg-orange-50 border-orange-200 text-orange-800",
  critical: "bg-red-50 border-red-200 text-red-800",
};

export function Dashboard() {
  const { user } = useAuthStore();

  const { data: scoresData } = useQuery({
    queryKey: ["health-scores"],
    queryFn: () => intelligenceApi.getHealthScores(2),
    staleTime: 10 * 60 * 1000,
  });

  const { data: alertsData } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => intelligenceApi.getAlerts(false),
    staleTime: 5 * 60 * 1000,
  });

  const scores = scoresData?.data?.scores || [];
  const latestScore = scores[0] || {};
  const previousScore = scores[1] || {};

  const getScoreDelta = (key: string) => {
    const curr = latestScore[key.replace("_score", "")];
    const prev = previousScore[key.replace("_score", "")];
    if (curr != null && prev != null) return curr - prev;
    return undefined;
  };

  const alerts = alertsData?.data?.slice(0, 3) || [];

  const firstName = user?.profile?.first_name || "there";

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white px-6 pt-8 pb-16">
        <div className="max-w-5xl mx-auto">
          <p className="text-blue-200 text-sm font-medium">Good morning,</p>
          <h1 className="text-2xl font-bold mt-0.5">{firstName} 👋</h1>

          {latestScore.overall_score != null && (
            <div className="mt-4 flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-white/60 flex items-center justify-center">
                  <span className="font-bold text-lg">{Math.round(latestScore.overall_score)}</span>
                </div>
                <div>
                  <p className="text-xs text-blue-200">Overall Health Score</p>
                  <p className="font-semibold text-sm">
                    {latestScore.overall_score >= 70
                      ? "Looking good!"
                      : latestScore.overall_score >= 50
                      ? "Room to improve"
                      : "Needs attention"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-10 space-y-6">
        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { to: "/upload", icon: <Upload size={18} />, label: "Upload Report", color: "from-blue-500 to-blue-600" },
            { to: "/chat", icon: <MessageSquare size={18} />, label: "Ask AI", color: "from-purple-500 to-purple-600" },
            { to: "/timeline", icon: <Activity size={18} />, label: "Timeline", color: "from-emerald-500 to-emerald-600" },
          ].map((action) => (
            <Link key={action.to} to={action.to}>
              <motion.div
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "bg-gradient-to-br text-white rounded-2xl p-4 shadow-md flex flex-col items-center gap-2",
                  action.color
                )}
              >
                {action.icon}
                <span className="text-xs font-semibold text-center">{action.label}</span>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* Health scores grid */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Health Scores</h2>
            <Link to="/scores" className="text-sm text-blue-600 flex items-center gap-1">
              Details <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {SCORE_CONFIG.map((config) => (
              <HealthScoreCard
                key={config.key}
                label={config.label}
                score={latestScore[config.key.replace("_score", "")] ?? null}
                delta={getScoreDelta(config.key)}
                icon={config.icon}
                color={config.color}
                bgColor={config.bg}
              />
            ))}
          </div>

          {latestScore.ai_narrative && (
            <div className="mt-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 flex gap-3">
              <Sparkles size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-900 leading-relaxed">{latestScore.ai_narrative}</p>
            </div>
          )}
        </div>

        {/* Predictive alerts */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-amber-500" />
                <h2 className="font-bold text-gray-900">Health Alerts</h2>
              </div>
              <Link to="/alerts" className="text-sm text-blue-600 flex items-center gap-1">
                All alerts <ChevronRight size={14} />
              </Link>
            </div>

            <div className="space-y-3">
              {alerts.map((alert: any) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "border rounded-xl p-3",
                    RISK_COLORS[alert.risk_level] || RISK_COLORS.moderate
                  )}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">{alert.title}</p>
                      <p className="text-xs mt-0.5 opacity-80">{alert.summary}</p>
                      {alert.recommended_actions?.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {alert.recommended_actions.slice(0, 2).map((action: string, i: number) => (
                            <li key={i} className="text-xs flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-current" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Footer disclaimer */}
        <p className="text-xs text-center text-gray-400 px-4">
          HealthWeave provides health intelligence for informational purposes only.
          It does not diagnose diseases or replace professional medical advice.
        </p>
      </div>
    </div>
  );
}
