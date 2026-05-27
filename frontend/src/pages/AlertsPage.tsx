import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell, AlertTriangle, ChevronDown, ChevronUp, X,
  Stethoscope, Lightbulb, ShieldCheck,
} from "lucide-react";
import { intelligenceApi } from "../services/api";
import { cn } from "../utils/cn";
import toast from "react-hot-toast";

const RISK: Record<string, {
  bar: string; bg: string; border: string; text: string;
  badge: string; badgeBg: string; dot: string;
}> = {
  critical: { bar:"bg-red-500",    bg:"bg-red-50/60",     border:"border-red-100",    text:"text-red-800",    badge:"text-red-600 bg-red-100",    badgeBg:"bg-red-500",    dot:"bg-red-500"    },
  high:     { bar:"bg-orange-500", bg:"bg-orange-50/60",  border:"border-orange-100", text:"text-orange-800", badge:"text-orange-600 bg-orange-100",badgeBg:"bg-orange-500", dot:"bg-orange-500" },
  moderate: { bar:"bg-amber-400",  bg:"bg-amber-50/60",   border:"border-amber-100",  text:"text-amber-800",  badge:"text-amber-700 bg-amber-100",  badgeBg:"bg-amber-400",  dot:"bg-amber-400"  },
  low:      { bar:"bg-emerald-400",bg:"bg-emerald-50/60", border:"border-emerald-100",text:"text-emerald-800",badge:"text-emerald-700 bg-emerald-100",badgeBg:"bg-emerald-400",dot:"bg-emerald-400"},
};

const FILTERS = ["all","critical","high","moderate","low"] as const;
type Filter = typeof FILTERS[number];

function AlertCard({ alert, onDismiss }: { alert: any; onDismiss: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const r = RISK[alert.risk_level] || RISK.moderate;

  return (
    <div className={cn("bg-white rounded-2xl border overflow-hidden shadow-card hover:shadow-card-hover transition-all", r.border)}>
      {/* top colour bar */}
      <div className={cn("h-1.5", r.bar)} />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", r.badge)}>
            <AlertTriangle size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full", r.badge)}>
                {alert.risk_level} risk
              </span>
              {alert.category && (
                <span className="text-[10px] text-slate-400 capitalize font-medium">{alert.category}</span>
              )}
            </div>
            <p className={cn("font-bold text-sm leading-snug", r.text)}>{alert.title}</p>
            <p className={cn("text-xs mt-1 leading-relaxed opacity-80", r.text)}>{alert.summary}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setOpen(v => !v)}
              className={cn("p-2 rounded-xl hover:bg-black/5 transition-colors", r.text)}>
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button onClick={() => onDismiss(alert.id)}
              className={cn("p-2 rounded-xl hover:bg-black/5 transition-colors", r.text)} title="Dismiss">
              <X size={14} />
            </button>
          </div>
        </div>

        {open && (
          <div className={cn("mt-4 pt-4 border-t space-y-3.5", r.border)}>
            {alert.detailed_explanation && (
              <p className={cn("text-xs leading-relaxed", r.text)}>{alert.detailed_explanation}</p>
            )}
            {alert.recommended_actions?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb size={11} className={r.text} />
                  <p className={cn("text-[10px] font-extrabold uppercase tracking-wider", r.text)}>Recommended Actions</p>
                </div>
                <ul className="space-y-1.5">
                  {alert.recommended_actions.map((action: string, i: number) => (
                    <li key={i} className={cn("flex items-start gap-2 text-xs", r.text)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", r.dot)} />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {alert.consult_specialist && (
              <div className={cn("flex items-center gap-2 text-xs font-bold", r.text)}>
                <Stethoscope size={12} className="shrink-0" />
                Consult: {alert.consult_specialist}
              </div>
            )}
            {alert.medical_disclaimer && (
              <p className={cn("text-[10px] opacity-50 italic", r.text)}>{alert.medical_disclaimer}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AlertsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [showDismissed, setShowDismissed] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["alerts", showDismissed],
    queryFn: () => intelligenceApi.getAlerts(showDismissed),
    staleTime: 2 * 60 * 1000,
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => intelligenceApi.dismissAlert(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["alerts"] }); toast.success("Alert dismissed"); },
  });

  const all: any[] = data?.data || [];
  const filtered = filter === "all" ? all : all.filter(a => a.risk_level === filter);
  const counts = {
    critical: all.filter(a => a.risk_level === "critical").length,
    high:     all.filter(a => a.risk_level === "high").length,
    moderate: all.filter(a => a.risk_level === "moderate").length,
    low:      all.filter(a => a.risk_level === "low").length,
  };

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Bell size={18} className="text-amber-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Health Alerts</h1>
          </div>
          <p className="text-sm text-slate-400 ml-[52px]">AI-generated preventive health indicators</p>
        </div>
        <button onClick={() => setShowDismissed(v => !v)}
          className={cn("text-xs font-semibold px-3.5 py-2 rounded-xl border transition-colors",
            showDismissed ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
          )}>
          {showDismissed ? "Hide dismissed" : "Show dismissed"}
        </button>
      </div>

      {/* Stat cards */}
      {all.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {(["critical","high","moderate","low"] as const).map(level => {
            const r = RISK[level];
            return (
              <div key={level} className={cn("rounded-2xl border p-4 text-center", r.bg, r.border)}>
                <p className={cn("text-2xl font-black", r.text)}>{counts[level]}</p>
                <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-0.5", r.text)}>{level}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("px-3.5 py-1.5 rounded-xl text-xs font-bold border capitalize transition-all",
              filter === f
                ? "bg-brand-blue text-white border-brand-blue shadow-blue-glow"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            )}>
            {f === "all" ? `All (${all.length})` : `${f} (${counts[f as keyof typeof counts] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-card">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={30} className="text-emerald-500" />
          </div>
          <p className="font-bold text-slate-700 mb-1">
            {all.length === 0 ? "No active health alerts" : "No alerts in this category"}
          </p>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            {all.length === 0
              ? "Your health looks stable. Upload more records for deeper AI analysis."
              : "Try selecting a different filter above."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(alert => (
            <AlertCard key={alert.id} alert={alert} onDismiss={id => dismiss.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  );
}
