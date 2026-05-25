/**
 * HealthWeave – Lifelong Health Timeline Component
 * Chronological display of all medical events with AI insights.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Pill,
  FileText,
  Syringe,
  Stethoscope,
  Scan,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { intelligenceApi } from "../../services/api";
import { cn } from "../../utils/cn";

interface TimelineEvent {
  id: string;
  event_date: string;
  event_type: string;
  event_title: string;
  event_summary?: string;
  severity: "info" | "warning" | "critical" | "improvement";
  tags: string[];
  ai_insight?: string;
  is_milestone: boolean;
  record_id: string;
}

interface TimelineYear {
  year: number;
  events: TimelineEvent[];
  summary?: string;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  lab_test: <Activity size={14} />,
  medication: <Pill size={14} />,
  imaging: <Scan size={14} />,
  hospitalization: <FileText size={14} />,
  vaccination: <Syringe size={14} />,
  consultation: <Stethoscope size={14} />,
  surgery: <AlertTriangle size={14} />,
  checkup: <TrendingUp size={14} />,
  symptom: <Activity size={14} />,
  vital: <Activity size={14} />,
};

const SEVERITY_STYLES: Record<string, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  critical: "border-red-200 bg-red-50 text-red-700",
  improvement: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const CONNECTOR_COLORS: Record<string, string> = {
  info: "bg-blue-400",
  warning: "bg-amber-400",
  critical: "bg-red-400",
  improvement: "bg-emerald-400",
};

function TimelineEventCard({ event }: { event: TimelineEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "relative ml-6 border rounded-xl p-3 cursor-pointer",
        SEVERITY_STYLES[event.severity] || SEVERITY_STYLES.info,
        event.is_milestone && "ring-2 ring-offset-1 ring-blue-400"
      )}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Timeline dot */}
      <div
        className={cn(
          "absolute -left-9 top-3 w-4 h-4 rounded-full border-2 border-white shadow flex items-center justify-center text-white",
          CONNECTOR_COLORS[event.severity] || "bg-blue-400"
        )}
      >
        <span className="text-[8px]">{EVENT_ICONS[event.event_type] || <Activity size={8} />}</span>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {event.is_milestone && (
              <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-medium">
                Milestone
              </span>
            )}
            <p className="text-sm font-semibold truncate">{event.event_title}</p>
          </div>
          <p className="text-xs mt-0.5 opacity-75">
            {format(new Date(event.event_date), "dd MMM yyyy")}
          </p>
        </div>
        <button className="opacity-60 shrink-0">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {event.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {event.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 bg-white/60 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {event.event_summary && (
              <p className="text-xs mt-2 leading-relaxed">{event.event_summary}</p>
            )}
            {event.ai_insight && (
              <div className="mt-2 flex items-start gap-1.5 bg-white/40 rounded-lg p-2">
                <Sparkles size={12} className="shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">{event.ai_insight}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function YearSection({ yearData }: { yearData: TimelineYear }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="relative">
      {/* Year header */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full mb-4 group"
      >
        <div className="w-16 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-bold shadow">
          {yearData.year}
        </div>
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-500 group-hover:text-gray-700">
          {yearData.events.length} events {open ? "▲" : "▼"}
        </span>
      </button>

      {/* Year AI summary */}
      {yearData.summary && open && (
        <div className="ml-6 mb-4 flex items-start gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-3">
          <Sparkles size={14} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">{yearData.summary}</p>
        </div>
      )}

      {/* Timeline line */}
      {open && (
        <div className="absolute left-[1.85rem] top-12 bottom-0 w-0.5 bg-gray-200" />
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {yearData.events.map((event) => (
              <TimelineEventCard key={event.id} event={event} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HealthTimeline() {
  const { data, isLoading } = useQuery({
    queryKey: ["timeline"],
    queryFn: () => intelligenceApi.getTimeline({ limit: 300 }),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const timeline: { years: TimelineYear[]; total_events: number } = data?.data || {
    years: [],
    total_events: 0,
  };

  if (timeline.years.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <Activity size={40} className="mx-auto mb-3 text-gray-300" />
        <p className="font-medium">No health records yet</p>
        <p className="text-sm mt-1">Upload your first medical document to start your health timeline.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Health Timeline</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {timeline.total_events} events across your medical journey
          </p>
        </div>
      </div>

      {timeline.years.map((yearData) => (
        <YearSection key={yearData.year} yearData={yearData} />
      ))}
    </div>
  );
}
