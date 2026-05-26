import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, Pill, FileText, Syringe, Stethoscope, ScanLine,
  AlertTriangle, TrendingUp, ChevronDown, ChevronUp, Sparkles, Upload,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
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
}

interface TimelineYear {
  year: number;
  events: TimelineEvent[];
  summary?: string;
}

const EVENT_ICON: Record<string, React.ElementType> = {
  lab_test:        Activity,
  medication:      Pill,
  imaging:         ScanLine,
  hospitalization: FileText,
  vaccination:     Syringe,
  consultation:    Stethoscope,
  surgery:         AlertTriangle,
  checkup:         TrendingUp,
  default:         Activity,
};

const SEV_DOT: Record<string, string> = {
  info:        "bg-blue-500",
  warning:     "bg-amber-400",
  critical:    "bg-red-500",
  improvement: "bg-emerald-500",
};

const SEV_CARD: Record<string, string> = {
  info:        "border-blue-100    bg-blue-50/60    text-blue-800",
  warning:     "border-amber-100   bg-amber-50/60   text-amber-800",
  critical:    "border-red-100     bg-red-50/60     text-red-800",
  improvement: "border-emerald-100 bg-emerald-50/60 text-emerald-800",
};

const SEV_TAG: Record<string, string> = {
  info:        "bg-blue-100/60    text-blue-700",
  warning:     "bg-amber-100/60   text-amber-700",
  critical:    "bg-red-100/60     text-red-700",
  improvement: "bg-emerald-100/60 text-emerald-700",
};

function EventCard({ event }: { event: TimelineEvent }) {
  const [open, setOpen] = useState(false);
  const IconComponent = EVENT_ICON[event.event_type] || EVENT_ICON.default;
  const cardCls  = SEV_CARD[event.severity]  || SEV_CARD.info;
  const dotCls   = SEV_DOT[event.severity]   || SEV_DOT.info;
  const tagCls   = SEV_TAG[event.severity]   || SEV_TAG.info;

  return (
    <div className="flex gap-4">
      {/* Timeline dot */}
      <div className="flex flex-col items-center shrink-0 pt-3">
        <div className={cn("w-3 h-3 rounded-full border-2 border-white shadow-sm", dotCls)} />
      </div>

      {/* Card */}
      <div
        className={cn(
          "flex-1 mb-3 border rounded-2xl overflow-hidden cursor-pointer transition-shadow hover:shadow-md",
          cardCls,
          event.is_milestone && "ring-2 ring-offset-1 ring-blue-400"
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", tagCls)}>
                <IconComponent size={13} />
              </div>
              <div className="flex-1 min-w-0">
                {event.is_milestone && (
                  <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold mr-1.5">
                    Milestone
                  </span>
                )}
                <p className="text-sm font-semibold leading-snug">{event.event_title}</p>
                <p className="text-xs mt-0.5 opacity-70">
                  {format(new Date(event.event_date), "dd MMM yyyy")}
                </p>
              </div>
            </div>
            <button className="opacity-60 shrink-0 mt-0.5">
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5 ml-9">
              {event.tags.slice(0, 5).map((tag) => (
                <span key={tag} className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", tagCls)}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {open && (
            <div className="mt-3 pt-3 border-t border-current/10 ml-9 space-y-2">
              {event.event_summary && (
                <p className="text-xs leading-relaxed">{event.event_summary}</p>
              )}
              {event.ai_insight && (
                <div className="flex items-start gap-2 bg-white/50 rounded-xl p-2.5">
                  <Sparkles size={11} className="shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed">{event.ai_insight}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function YearSection({ yearData }: { yearData: TimelineYear }) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 w-full mb-4 group"
      >
        <div className="w-14 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-sm">
          {yearData.year}
        </div>
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 group-hover:text-gray-600 flex items-center gap-1 font-medium">
          {yearData.events.length} events
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </button>

      {yearData.summary && open && (
        <div className="flex items-start gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-3 mb-4 ml-4">
          <Sparkles size={13} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">{yearData.summary}</p>
        </div>
      )}

      {open && (
        <div className="ml-4 border-l-2 border-gray-100 pl-4">
          {yearData.events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
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
      <div className="space-y-5">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <div className="h-7 w-16 bg-gray-200 rounded-lg mb-4 animate-pulse" />
            <div className="space-y-3 ml-4">
              {[...Array(2)].map((_, j) => (
                <div key={j} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const timeline: { years: TimelineYear[]; total_events: number } =
    data?.data || { years: [], total_events: 0 };

  if (timeline.years.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Activity size={28} className="text-gray-300" />
        </div>
        <p className="font-semibold text-gray-700 mb-1">No health events yet</p>
        <p className="text-sm text-gray-400 max-w-xs mx-auto mb-5">
          Upload your medical documents to build your lifelong health timeline
        </p>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Upload size={14} /> Upload First Document
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 text-sm text-gray-500 bg-white border border-gray-100 rounded-xl px-4 py-3">
        <Sparkles size={14} className="text-blue-500 shrink-0" />
        <span>
          <strong className="text-gray-800">{timeline.total_events} medical events</strong> across your health history — click any event for details and AI insights
        </span>
      </div>

      {timeline.years.map((yearData) => (
        <YearSection key={yearData.year} yearData={yearData} />
      ))}
    </div>
  );
}
