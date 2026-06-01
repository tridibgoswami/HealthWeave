import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Zap, ShieldCheck, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { DocumentUpload } from "../components/reports/DocumentUpload";
import { intelligenceApi, recordsApi } from "../services/api";

const HOW_IT_WORKS = [
  { Icon: Upload,      color: "text-brand-blue",  bg: "bg-blue-50",    text: "Upload any format — PDF, JPG, PNG, handwritten scans" },
  { Icon: Zap,         color: "text-amber-500",   bg: "bg-amber-50",   text: "AI extracts biomarkers, diagnoses and medication info" },
  { Icon: Clock,       color: "text-purple-500",  bg: "bg-purple-50",  text: "Results appear in your dashboard within 30–60 seconds" },
  { Icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-50", text: "AES-256 encrypted — only you can access your records" },
];

function BiomarkerChanges({ changes }: { changes: any[] }) {
  if (!changes || changes.length === 0) return null;
  return (
    <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-brand-blue" />
        <h3 className="text-sm font-bold text-slate-800">Changes Since Last Test</h3>
      </div>
      <div className="space-y-2">
        {changes.map((change: any, idx: number) => {
          const delta = change.delta_percent ?? change.delta ?? null;
          const increased = delta != null ? delta > 0 : null;
          return (
            <div key={idx} className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 capitalize">
                  {(change.name || change.biomarker_name || "").replace(/_/g, " ")}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs shrink-0">
                {change.old_value != null && (
                  <span className="text-slate-400">{change.old_value}{change.unit ? ` ${change.unit}` : ""}</span>
                )}
                {change.old_value != null && change.new_value != null && (
                  <span className="text-slate-300">→</span>
                )}
                {change.new_value != null && (
                  <span className="font-bold text-slate-800">{change.new_value}{change.unit ? ` ${change.unit}` : ""}</span>
                )}
                {delta != null && (
                  <span className={`flex items-center gap-0.5 font-bold ${
                    increased ? "text-red-500" : "text-emerald-600"
                  }`}>
                    {increased ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {delta > 0 ? "+" : ""}{typeof delta === "number" ? delta.toFixed(1) : delta}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function UploadPage() {
  const qc = useQueryClient();
  const [biomarkerChanges, setBiomarkerChanges] = useState<any[] | null>(null);

  const fetchChanges = async (recordId: string) => {
    try {
      const res = await recordsApi.get(recordId);
      const changes = res.data?.biomarker_changes;
      if (Array.isArray(changes) && changes.length > 0) {
        setBiomarkerChanges(changes);
      }
    } catch {
      // silently ignore
    }
  };

  const onComplete = (recordId?: string) => {
    qc.invalidateQueries({ queryKey: ["records-list"] });
    qc.invalidateQueries({ queryKey: ["timeline"] });
    // Backend auto-computes scores after processing, but also trigger manually
    // in case the user is on a slower connection or AI is queued.
    intelligenceApi.computeScores().catch(() => {});
    // Refetch scores after ~45s to pick up freshly computed values
    setTimeout(() => {
      qc.invalidateQueries({ queryKey: ["health-scores"] });
      qc.invalidateQueries({ queryKey: ["alerts", false] });
      // Fetch biomarker changes for this record
      if (recordId) fetchChanges(recordId);
    }, 45000);
  };

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <Upload size={18} className="text-brand-blue" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Upload Health Records</h1>
        </div>
        <p className="text-sm text-slate-400 ml-[52px]">Lab reports, prescriptions, scans — AI reads everything</p>
      </div>

      {/* How it works strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 sm:mb-7">
        {HOW_IT_WORKS.map(({ Icon, color, bg, text }) => (
          <div key={text} className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 flex flex-col items-start gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${bg}`}>
              <Icon size={15} className={color} />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      {/* Upload card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-card-hover p-6">
        <DocumentUpload onUploadComplete={onComplete} />
      </div>

      {/* Biomarker changes (shown after successful upload + processing) */}
      {biomarkerChanges && <BiomarkerChanges changes={biomarkerChanges} />}
    </div>
  );
}
