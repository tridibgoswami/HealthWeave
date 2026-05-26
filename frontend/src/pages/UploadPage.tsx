import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Info } from "lucide-react";
import { DocumentUpload } from "../components/reports/DocumentUpload";

export function UploadPage() {
  const qc = useQueryClient();

  const onComplete = () => {
    qc.invalidateQueries({ queryKey: ["records-list"] });
    qc.invalidateQueries({ queryKey: ["health-scores"] });
    qc.invalidateQueries({ queryKey: ["timeline"] });
  };

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Upload size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Upload Health Records</h1>
            <p className="text-sm text-gray-500">Add lab reports, prescriptions, scans and more</p>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
        <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800 mb-0.5">How AI processing works</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            Our AI reads your documents using OCR, extracts biomarkers and diagnoses, then builds your
            health timeline automatically. Handwritten reports and scans are fully supported.
            Processing takes 30–60 seconds after upload.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <DocumentUpload onUploadComplete={onComplete} />
      </div>
    </div>
  );
}
