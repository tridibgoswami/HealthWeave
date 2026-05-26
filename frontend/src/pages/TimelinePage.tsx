import React from "react";
import { Activity } from "lucide-react";
import { HealthTimeline } from "../components/timeline/HealthTimeline";

export function TimelinePage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Activity size={18} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Health Timeline</h1>
          <p className="text-sm text-gray-500">Your complete medical history, chronologically organised</p>
        </div>
      </div>
      <HealthTimeline />
    </div>
  );
}
