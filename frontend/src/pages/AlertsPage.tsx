import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell, AlertTriangle, ChevronDown, ChevronUp, X,
  CheckCircle, Stethoscope, Lightbulb, ShieldCheck,
} from "lucide-react";
import { intelligenceApi } from "../services/api";
import { cn } from "../utils/cn";
import toast from "react-hot-toast";

const RISK_CONFIG: Record<string, {
  bar: string; bg: string; border: string; text: string; badge: string; dot: string;
}> = {
  critical: { bar: "bg-red-500",    bg: "bg-red-50",     border: "border-red-100",    text: "text-red-800",    badge: "bg-red-500 text-white",          dot: "bg-red-500"    },
  high:     { bar: "bg-orange-500", bg: "bg-orange-50",  border: "border-orange-100", text: "text-orange-800", badge: "bg-orange-500 text-white",        dot: "bg-orange-500" },
  moderate: { bar: "bg-amber-400",  bg: "bg-amber-50",   border: "border-amber-100",  text: "text-amber-800",  badge: "bg-amber-100 text-amber-700",     dot: "bg-amber-400"  },
  low:      { bar: "bg-emerald-400",bg: "bg-emerald-50", border: "border-emerald-100",text: "text-emerald-800",badge: "bg-emerald-100 text-emerald-700",  dot: "bg-emerald-400"},
};

const FILTERS = ["all", "critical", "high", "moderate", "low"] as const;
type Filter = typeof FILTERS[number];

function AlertCard({ alert, onDismiss }: { alert: any; onDismiss: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const risk = RISK_CONFIG[alert.risk_level] || RISK_CONFIG.moderate;

  return (
    <div className={cn("rounded-2xl border overflow-hidden transition-shadow hover:shadow-md", risk.bg, risk.border)}>
      {/* Severity bar */}
      <div className={cn("h-1", risk.bar)} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5", risk.badge)}>
            <AlertTriangle size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", risk.badge)}>
                {alert.risk_level} risk
              </span>
              {alert.category && (
                <span className="text-[10px] text-gray-500 font-medium capitalize">{alert.category}</span>
              )}
            </div>
            <p className={cn("font-semibold text-sm", risk.text)}>{alert.title}</p>
            <p className={cn("text-xs mt-1 opacity-80 leading-relaxed", risk.text)}>{alert.summary}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setExpanded((v) => !v)}
              className={cn("p-2 rounded-xl hover:bg-white/50 transition-colors", risk.text)}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button
              onClick={() => onDismiss(alert.id)}
              className={cn("p-2 rounded-xl hover:bg-white/50 transition-colors", risk.text)}
              title="Dismiss alert"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className={cn("mt-4 pt-4 border-t space-y-3", risk.border)}>
            {alert.detailed_explanation && (
              <p className={cn("text-xs leading-relaxed", risk.text)}>{alert.detailed_explanation}</p>
            )}

            {alert.recommended_actions?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb size={11} className={risk.text} />
                  <p className={cn("text-xs font-bold uppercase tracking-wide", risk.text)}>Recommended Actions</p>
                </div>
                <ul className="space-y-1.5">
                  {alert.recommended_actions.map((action: string, i: number) => (
                    <li key={i} className={cn("flex items-start gap-2 text-xs", risk.text)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", risk.dot)} />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {alert.consult_specialist && (
              <div className={cn("flex items-center gap-2 text-xs font-semibold", risk.text)}>
                <Stethoscope size={12} className="shrink-0" />
                Consult: {alert.consult_specialist}
              </div>
            )}

            {alert.medical_disclaimer && (
              <p className={cn("text-[10px] opacity-60 italic", risk.text)}>{alert.medical_disclaimer}</p>
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alert dismissed");
    },
  });

  const allAlerts: any[] = data?.data || [];
  const filtered = filter === "all" ? allAlerts : allAlerts.filter((a) => a.risk_level === filter);

  const counts = {
    critical: allAlerts.filter((a) => a.risk_level === "critical").length,
    high:     allAlerts.filter((a) => a.risk_level === "high").length,
    moderate: allAlerts.filter((a) => a.risk_level === "moderate").length,
    low:      allAlerts.filter((a) => a.risk_level === "low").length,
  };

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Bell size={18} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Health Alerts</h1>
            <p className="text-sm text-gray-500">AI-generated preventive health indicators</p>
          </div>
        </div>
        <button
          onClick={() => setShowDismissed((v) => !v)}
          className={cn(
            "text-xs font-semibold px-3 py-2 rounded-xl border transition-colors",
            showDismissed
              ? "bg-gray-100 text-gray-700 border-gray-200"
              : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
          )}
        >
          {showDismissed ? "Hide dismissed" : "Show dismissed"}
        </button>
      </div>

      {/* Summary stats */}
      {allAlerts.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {(["critical", "high", "moderate", "low"] as const).map((level) => {
            const r = RISK_CONFIG[level];
            return (
              <div key={level} className={cn("rounded-2xl border p-4 text-center", r.bg, r.border)}>
                <p className={cn("text-2xl font-bold", r.text)}>{counts[level]}</p>
                <p className={cn("text-xs font-semibold capitalize mt-0.5", r.text)}>{level}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all capitalize",
              filter === f
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            )}
          >
            {f === "all" ? `All (${allAlerts.length})` : `${f} (${counts[f as keyof typeof counts] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={28} className="text-emerald-500" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">
            {allAlerts.length === 0 ? "No active health alerts" : "No alerts in this category"}
          </p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            {allAlerts.length === 0
              ? "Your health looks stable. Upload more records for deeper AI analysis."
              : "Try selecting a different filter above."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onDismiss={(id) => dismiss.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
