import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { intelligenceApi } from "../services/api";
import { AlertTriangle, X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../utils/cn";

const RISK_STYLES: Record<string, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-800",
  moderate: "border-amber-200 bg-amber-50 text-amber-800",
  high: "border-orange-200 bg-orange-50 text-orange-800",
  critical: "border-red-200 bg-red-50 text-red-800",
};

export function AlertsPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["alerts", false],
    queryFn: () => intelligenceApi.getAlerts(false),
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => intelligenceApi.dismissAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const alerts = data?.data || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="font-bold text-gray-900">Health Alerts</h1>
          <p className="text-sm text-gray-500">AI-generated preventive health indicators</p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <AlertTriangle size={40} className="mx-auto mb-3 text-gray-200" />
          <p>No active alerts. Your health looks stable!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert: any) => (
            <div key={alert.id} className={cn("border rounded-2xl p-4", RISK_STYLES[alert.risk_level] || RISK_STYLES.moderate)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase px-2 py-0.5 bg-white/60 rounded-full">
                      {alert.risk_level} risk
                    </span>
                    <span className="text-xs opacity-70">{alert.category}</span>
                  </div>
                  <p className="font-semibold mt-1">{alert.title}</p>
                  <p className="text-sm mt-0.5 opacity-80">{alert.summary}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setExpanded(expanded === alert.id ? null : alert.id)}
                    className="p-1 rounded-lg hover:bg-white/40">
                    {expanded === alert.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button onClick={() => dismiss.mutate(alert.id)} className="p-1 rounded-lg hover:bg-white/40">
                    <X size={14} />
                  </button>
                </div>
              </div>

              {expanded === alert.id && (
                <div className="mt-3 pt-3 border-t border-current/20 space-y-2">
                  {alert.detailed_explanation && (
                    <p className="text-sm leading-relaxed">{alert.detailed_explanation}</p>
                  )}
                  {alert.recommended_actions?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold mb-1">Recommended Actions:</p>
                      <ul className="space-y-1">
                        {alert.recommended_actions.map((a: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-current mt-1.5 shrink-0" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {alert.consult_specialist && (
                    <p className="text-sm font-medium">Consult: {alert.consult_specialist}</p>
                  )}
                  <p className="text-xs opacity-60">{alert.medical_disclaimer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
