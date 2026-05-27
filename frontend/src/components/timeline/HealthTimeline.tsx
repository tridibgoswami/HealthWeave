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

const SEV: Record<string, {
  dot: string; card: string; icon: string; tag: string; line: string;
}> = {
  info:        { dot: "bg-brand-blue",  card: "border-blue-100 bg-blue-50/40",    icon: "text-brand-blue bg-blue-100",   tag: "bg-blue-100 text-brand-blue",    line: "border-blue-200" },
  warning:     { dot: "bg-amber-400",   card: "border-amber-100 bg-amber-50/40",  icon: "text-amber-600 bg-amber-100",   tag: "bg-amber-100 text-amber-700",    line: "border-amber-200" },
  critical:    { dot: "bg-red-500",     card: "border-red-100 bg-red-50/40",      icon: "text-red-600 bg-red-100",       tag: "bg-red-100 text-red-700",        line: "border-red-200" },
  improvement: { dot: "bg-emerald-500", card: "border-emerald-100 bg-emerald-50/40", icon: "text-emerald-600 bg-emerald-100", tag: "bg-emerald-100 text-emerald-700", line: "border-emerald-200" },
};

function EventCard({ event }: { event: TimelineEvent }) {
  const [open, setOpen] = useState(false);
  const IconComponent = EVENT_ICON[event.event_type] || EVENT_ICON.default;
  const s = SEV[event.severity] || SEV.info;

  return (
    <div className="flex gap-4">
      {/* Timeline dot */}
      <div className="flex flex-col items-center shrink-0 pt-3.5">
        <div className={cn("w-3 h-3 rounded-full border-2 border-white shadow-card", s.dot)} />
      </div>

      {/* Card */}
      <div
        className={cn(
          "flex-1 mb-3 border rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-card-hover",
          s.card,
          event.is_milestone && "ring-2 ring-offset-1 ring-brand-blue/40"
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", s.icon)}>
                <IconComponent size={13} />
              </div>
              <div className="flex-1 min-w-0">
                {event.is_milestone && (
                  <span className="text-[10px] bg-brand-blue text-white px-1.5 py-0.5 rounded-full font-bold mr-1.5">
                    Milestone
                  </span>
                )}
                <p className="text-sm font-semibold text-slate-800 leading-snug">{event.event_title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {format(new Date(event.event_date), "dd MMM yyyy")}
                </p>
              </div>
            </div>
            <button className="text-slate-400 shrink-0 mt-0.5 hover:text-slate-600 transition-colors">
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5 ml-9">
              {event.tags.slice(0, 5).map((tag) => (
                <span key={tag} className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", s.tag)}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {open && (
            <div className={cn("mt-3 pt-3 border-t ml-9 space-y-2", s.line)}>
              {event.event_summary && (
                <p className="text-xs text-slate-700 leading-relaxed">{event.event_summary}</p>
              )}
              {event.ai_insight && (
                <div className="flex items-start gap-2 bg-white/70 border border-slate-100 rounded-xl p-2.5 shadow-card">
                  <Sparkles size={11} className="text-brand-blue shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-700 leading-relaxed">{event.ai_insight}</p>
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
        <div className="px-3 h-7 bg-brand-blue text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-blue-glow">
          {yearData.year}
        </div>
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400 group-hover:text-slate-600 flex items-center gap-1 font-semibold transition-colors">
          {yearData.events.length} events
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </button>

      {yearData.summary && open && (
        <div className="flex items-start gap-2.5 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-2xl p-3.5 mb-4 ml-4">
          <Sparkles size={13} className="text-brand-blue shrink-0 mt-0.5" />
          <p className="text-xs text-slate-700 leading-relaxed">{yearData.summary}</p>
        </div>
      )}

      {open && (
        <div className="ml-4 border-l-2 border-slate-100 pl-4">
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
            <div className="h-7 w-16 skeleton rounded-lg mb-4" />
            <div className="space-y-3 ml-4">
              {[...Array(2)].map((_, j) => (
                <div key={j} className="h-20 skeleton rounded-2xl" />
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
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-card">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Activity size={28} className="text-slate-300" />
        </div>
        <p className="font-bold text-slate-700 mb-1">No health events yet</p>
        <p className="text-sm text-slate-400 max-w-xs mx-auto mb-5">
          Upload your medical documents to build your lifelong health timeline
        </p>
        <Link
          to="/upload"
          className="btn-primary inline-flex"
        >
          <Upload size={14} /> Upload First Document
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 text-sm text-slate-500 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-card">
        <Sparkles size={14} className="text-brand-blue shrink-0" />
        <span>
          <strong className="text-slate-800 font-bold">{timeline.total_events} medical events</strong> across your health history — click any event for details and AI insights
        </span>
      </div>

      {timeline.years.map((yearData) => (
        <YearSection key={yearData.year} yearData={yearData} />
      ))}
    </div>
  );
}
