/**
 * HealthWeave – Health Score Radial Card
 * Displays a domain health score with trend indicator.
 */

import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "../../utils/cn";

interface Props {
  label: string;
  score: number | null;
  delta?: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

function scoreToGrade(score: number | null): { grade: string; color: string } {
  if (score === null) return { grade: "—", color: "text-gray-400" };
  if (score >= 85) return { grade: "Excellent", color: "text-emerald-600" };
  if (score >= 70) return { grade: "Good", color: "text-blue-600" };
  if (score >= 55) return { grade: "Fair", color: "text-amber-600" };
  if (score >= 40) return { grade: "Poor", color: "text-orange-600" };
  return { grade: "Critical", color: "text-red-600" };
}

export function HealthScoreCard({ label, score, delta, icon, color, bgColor }: Props) {
  const { grade, color: gradeColor } = scoreToGrade(score);
  const displayScore = score !== null ? Math.round(score) : null;

  const circumference = 2 * Math.PI * 28;
  const progress = score !== null ? (score / 100) * circumference : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", bgColor)}>
          <span className={color}>{icon}</span>
        </div>
        {delta !== undefined && delta !== 0 && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              delta > 0 ? "text-emerald-600" : "text-red-500"
            )}
          >
            {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(delta).toFixed(1)}
          </span>
        )}
        {delta === 0 && (
          <span className="flex items-center gap-0.5 text-xs text-gray-400">
            <Minus size={12} /> Stable
          </span>
        )}
      </div>

      {/* Radial progress */}
      <div className="flex items-center justify-center">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="6"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              className={color}
              style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-900">
              {displayScore ?? "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className={cn("text-xs font-medium mt-0.5", gradeColor)}>{grade}</p>
      </div>
    </motion.div>
  );
}
