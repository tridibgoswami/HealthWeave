import React, { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Upload, Zap, ShieldCheck, Clock, TrendingUp, TrendingDown,
  CheckCircle, AlertTriangle, Loader2, FileText, Activity,
} from "lucide-react";
import { DocumentUpload } from "../components/reports/DocumentUpload";
import { intelligenceApi, recordsApi } from "../services/api";

const HOW_IT_WORKS = [
  { Icon: Upload,      color: "text-brand-blue",  bg: "bg-blue-50",    text: "Upload any format — PDF, JPG, PNG, handwritten scans" },
  { Icon: Zap,         color: "text-amber-500",   bg: "bg-amber-50",   text: "AI extracts biomarkers, diagnoses and medication info" },
  { Icon: Clock,       color: "text-purple-500",  bg: "bg-purple-50",  text: "Results appear in your dashboard within 30–60 seconds" },
  { Icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-50", text: "AES-256 encrypted — only you can access your records" },
];

type AnalysisState =
  | { phase: "idle" }
  | { phase: "processing"; recordId: string }
  | { phase: "done"; record: any }
  | { phase: "failed"; message: string };

function AnalysisProcessing() {
  return (
    <div className="mt-6 bg-white rounded-2xl border border-blue-100 shadow-card p-6 text-center">
      <Loader2 size={28} className="text-brand-blue animate-spin mx-auto mb-3" />
      <p className="text-sm font-semibold text-slate-700 mb-1">AI is analysing your report…</p>
      <p className="text-xs text-slate-400">
        Reading biomarkers, extracting values and writing your summary.
        This usually takes 20–60 seconds.
      </p>
    </div>
  );
}

function AnalysisResult({ record }: { record: any }) {
  const findings: string[] = record.key_findings ?? [];
  const biomarkers: any[] = record.biomarkers ?? [];
  const changes: any[] = record.biomarker_changes?.changes ?? [];
  const riskFlags: string[] = record.ai_risk_flags ?? [];
  const summary: string = record.ai_summary ?? "";

  return (
    <div className="mt-6 space-y-4">
      {/* Success banner */}
      <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
        <CheckCircle size={16} className="text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-emerald-800">Analysis complete</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            {biomarkers.length > 0
              ? `${biomarkers.length} biomarker${biomarkers.length !== 1 ? "s" : ""} extracted from your report`
              : "Your report has been saved successfully"}
          </p>
        </div>
      </div>

      {/* Key findings */}
      {findings.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-brand-blue" />
            <h3 className="text-sm font-bold text-slate-800">AI Summary</h3>
          </div>
          <ul className="space-y-3">
            {findings.map((finding, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-blue-50 text-brand-blue text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {finding}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI summary (fallback when no key_findings) */}
      {findings.length === 0 && summary && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-brand-blue" />
            <h3 className="text-sm font-bold text-slate-800">AI Summary</h3>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Risk flags */}
      {riskFlags.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-600" />
            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Attention areas</h3>
          </div>
          <ul className="space-y-1">
            {riskFlags.map((flag, i) => (
              <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0">•</span>{flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Biomarker changes vs last test */}
      {changes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-brand-blue" />
            <h3 className="text-sm font-bold text-slate-800">Changes Since Last Test</h3>
          </div>
          <div className="space-y-2">
            {changes.map((change: any, idx: number) => {
              const delta = change.delta_percent ?? change.delta ?? null;
              const increased = delta != null ? delta > 0 : null;
              return (
                <div key={idx} className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
                  <p className="text-sm font-semibold text-slate-700 capitalize flex-1 min-w-0">
                    {(change.name || change.biomarker_name || "").replace(/_/g, " ")}
                  </p>
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
                      <span className={`flex items-center gap-0.5 font-bold ${increased ? "text-red-500" : "text-emerald-600"}`}>
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
      )}
    </div>
  );
}

function AnalysisFailed({ message }: { message: string }) {
  return (
    <div className="mt-6 flex items-start gap-2.5 p-4 bg-red-50 border border-red-100 rounded-xl">
      <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-bold text-red-700">Analysis issue</p>
        <p className="text-xs text-red-600 mt-0.5">{message}</p>
      </div>
    </div>
  );
}

export function UploadPage() {
  const qc = useQueryClient();
  const [analysis, setAnalysis] = useState<AnalysisState>({ phase: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = (recordId: string) => {
    setAnalysis({ phase: "processing", recordId });
    const startedAt = Date.now();
    const TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
    const INTERVAL_MS = 5_000;

    pollRef.current = setInterval(async () => {
      if (Date.now() - startedAt > TIMEOUT_MS) {
        stopPolling();
        setAnalysis({ phase: "failed", message: "Processing is taking longer than expected. Check your record in the dashboard shortly." });
        return;
      }

      try {
        const res = await recordsApi.get(recordId);
        const record = res.data;
        const docStatus = record?.document_status;

        if (docStatus === "processed") {
          stopPolling();
          setAnalysis({ phase: "done", record });
          // Refresh cached queries so dashboard reflects new data
          qc.invalidateQueries({ queryKey: ["health-scores"] });
          qc.invalidateQueries({ queryKey: ["alerts", false] });
        } else if (docStatus === "failed") {
          stopPolling();
          setAnalysis({ phase: "failed", message: "AI could not extract data from this document. Try re-uploading a clearer image or PDF." });
        }
        // "processing" → keep polling
      } catch {
        // Network blip — keep polling until timeout
      }
    }, INTERVAL_MS);
  };

  const onComplete = (recordId?: string) => {
    qc.invalidateQueries({ queryKey: ["records-list"] });
    qc.invalidateQueries({ queryKey: ["timeline"] });
    intelligenceApi.computeScores().catch(() => {});

    if (recordId) {
      startPolling(recordId);
    }
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

      {/* Analysis result area */}
      {analysis.phase === "processing" && <AnalysisProcessing />}
      {analysis.phase === "done"       && <AnalysisResult record={analysis.record} />}
      {analysis.phase === "failed"     && <AnalysisFailed message={analysis.message} />}
    </div>
  );
}
