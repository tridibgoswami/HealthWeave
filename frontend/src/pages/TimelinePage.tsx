import React from "react";
import { Activity } from "lucide-react";
import { HealthTimeline } from "../components/timeline/HealthTimeline";

export function TimelinePage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Activity size={18} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Health Timeline</h1>
        </div>
        <p className="text-sm text-slate-400 ml-[52px]">Your complete medical history, chronologically organised</p>
      </div>
      <HealthTimeline />
    </div>
  );
}
