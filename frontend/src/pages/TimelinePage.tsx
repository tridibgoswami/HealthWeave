import React from "react";
import { HealthTimeline } from "../components/timeline/HealthTimeline";

export function TimelinePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-2xl mx-auto">
      <HealthTimeline />
    </div>
  );
}
