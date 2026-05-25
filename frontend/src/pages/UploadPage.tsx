import React from "react";
import { DocumentUpload } from "../components/reports/DocumentUpload";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function UploadPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="font-bold text-gray-900">Upload Documents</h1>
          <p className="text-sm text-gray-500">Lab reports, prescriptions, scans</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <DocumentUpload onUploadComplete={() => {}} />
      </div>
    </div>
  );
}
