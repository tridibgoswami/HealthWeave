import React from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "../../utils/cn";

interface Props {
  label: string;
  score: number | null;
  delta?: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

function grade(score: number | null) {
  if (!score) return { label: "—",        cls: "text-gray-400" };
  if (score >= 85) return { label: "Excellent", cls: "text-emerald-600" };
  if (score >= 70) return { label: "Good",      cls: "text-blue-600" };
  if (score >= 55) return { label: "Fair",      cls: "text-amber-600" };
  if (score >= 40) return { label: "Poor",      cls: "text-orange-600" };
  return              { label: "Critical",  cls: "text-red-600" };
}

function ScoreRing({ score, colorClass }: { score: number; colorClass: string }) {
  const circ = 2 * Math.PI * 28;
  const fill = (Math.min(score, 100) / 100) * circ;
  return (
    <div className="relative w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="28" fill="none" stroke="#F1F5F9" strokeWidth="6" />
        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - fill}
          className={colorClass} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-base font-bold text-gray-900">{Math.round(score)}</span>
      </div>
    </div>
  );
}

export function HealthScoreCard({ label, score, delta, icon, color, bgColor }: Props) {
  const { label: gradeLabel, cls: gradeClass } = grade(score);

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", bgColor)}>
          <span className={color}>{icon}</span>
        </div>
        {delta !== undefined && (
          <span className={cn("flex items-center gap-0.5 text-xs font-semibold",
            delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-gray-400"
          )}>
            {delta > 0 ? <ArrowUp size={11} /> : delta < 0 ? <ArrowDown size={11} /> : <Minus size={11} />}
            {delta !== 0 ? Math.abs(delta) : "stable"}
          </span>
        )}
      </div>

      <div className="flex justify-center">
        {score !== null ? (
          <ScoreRing score={score} colorClass={color} />
        ) : (
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-sm text-gray-400 font-semibold">—</span>
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className={cn("text-xs font-medium mt-0.5", gradeClass)}>{gradeLabel}</p>
      </div>
    </div>
  );
}
