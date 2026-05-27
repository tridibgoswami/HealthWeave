import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Zap, ShieldCheck, Clock } from "lucide-react";
import { DocumentUpload } from "../components/reports/DocumentUpload";

const HOW_IT_WORKS = [
  { Icon: Upload,      color: "text-brand-blue",  bg: "bg-blue-50",    text: "Upload any format — PDF, JPG, PNG, handwritten scans" },
  { Icon: Zap,         color: "text-amber-500",   bg: "bg-amber-50",   text: "AI extracts biomarkers, diagnoses and medication info" },
  { Icon: Clock,       color: "text-purple-500",  bg: "bg-purple-50",  text: "Results appear in your dashboard within 30–60 seconds" },
  { Icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-50", text: "AES-256 encrypted — only you can access your records" },
];

export function UploadPage() {
  const qc = useQueryClient();

  const onComplete = () => {
    qc.invalidateQueries({ queryKey: ["records-list"] });
    qc.invalidateQueries({ queryKey: ["health-scores"] });
    qc.invalidateQueries({ queryKey: ["timeline"] });
  };

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Upload size={18} className="text-brand-blue" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Upload Health Records</h1>
        </div>
        <p className="text-sm text-slate-400 ml-[52px]">Lab reports, prescriptions, scans — AI reads everything</p>
      </div>

      {/* How it works strip */}
      <div className="grid grid-cols-4 gap-3 mb-7">
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
    </div>
  );
}
