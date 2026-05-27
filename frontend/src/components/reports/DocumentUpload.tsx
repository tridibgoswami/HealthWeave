import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AnimatePresence, motion } from "framer-motion";
import {
  Upload, FileText, Image as ImageIcon, CheckCircle2, XCircle,
  Loader2, X, FlaskConical, Pill, ScanLine, FileSymlink,
  Syringe, Stethoscope, Scissors, Activity, Heart, FileQuestion,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import { recordsApi } from "../../services/api";
import { cn } from "../../utils/cn";

interface UploadFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "processing" | "done" | "error";
  progress: number;
  recordId?: string;
  error?: string;
}

const RECORD_TYPES = [
  { value: "lab_report",          label: "Lab Report",     Icon: FlaskConical },
  { value: "prescription",        label: "Prescription",   Icon: Pill },
  { value: "scan",                label: "Scan / X-ray",   Icon: ScanLine },
  { value: "discharge_summary",   label: "Discharge",      Icon: FileSymlink },
  { value: "vaccination",         label: "Vaccination",    Icon: Syringe },
  { value: "doctor_visit",        label: "Doctor Visit",   Icon: Stethoscope },
  { value: "surgery",             label: "Surgery",        Icon: Scissors },
  { value: "vital_reading",       label: "Vitals",         Icon: Activity },
  { value: "health_package",      label: "Health Package", Icon: Heart },
  { value: "other",               label: "Other",          Icon: FileQuestion },
];

const ACCEPTED = {
  "application/pdf":  [".pdf"],
  "image/jpeg":       [".jpg", ".jpeg"],
  "image/png":        [".png"],
  "image/webp":       [".webp"],
};

const STATUS_LABEL: Record<UploadFile["status"], string> = {
  pending:    "Queued",
  uploading:  "Uploading…",
  processing: "AI analyzing…",
  done:       "Saved successfully",
  error:      "Failed",
};

export function DocumentUpload({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [docType, setDocType] = useState("lab_report");
  const [hospitalName, setHospitalName] = useState("");
  const [doctorName, setDoctorName] = useState("");

  const doUpload = useCallback(async (id: string, file: File, type: string) => {
    setFiles((p) => p.map((f) => f.id === id ? { ...f, status: "uploading", progress: 35 } : f));

    const form = new FormData();
    form.append("file", file);
    form.append("title", file.name.replace(/\.[^.]+$/, ""));
    form.append("record_type", type);
    if (hospitalName) form.append("hospital_name", hospitalName);
    if (doctorName)   form.append("doctor_name",   doctorName);

    try {
      setFiles((p) => p.map((f) => f.id === id ? { ...f, progress: 65 } : f));
      const res = await recordsApi.upload(form);
      setFiles((p) => p.map((f) => f.id === id
        ? { ...f, status: "processing", progress: 85, recordId: res.data.record_id }
        : f
      ));

      setTimeout(() => {
        setFiles((p) => p.map((f) => f.id === id ? { ...f, status: "done", progress: 100 } : f));
        toast.success("Record saved and queued for AI analysis");
        onUploadComplete?.();
      }, 2000);
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Upload failed. Please try again.";
      setFiles((p) => p.map((f) => f.id === id ? { ...f, status: "error", error: msg } : f));
      toast.error(msg);
    }
  }, [hospitalName, doctorName, onUploadComplete]);

  const onDrop = useCallback((accepted: File[]) => {
    const uploads: UploadFile[] = accepted.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      status: "pending",
      progress: 0,
    }));
    setFiles((p) => [...p, ...uploads]);
    const currentType = docType;
    uploads.forEach((u) => doUpload(u.id, u.file, currentType));
  }, [docType, doUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: 50 * 1024 * 1024,
    onDropRejected: (rejected) => {
      rejected.forEach(({ errors }) => toast.error(errors[0]?.message || "File rejected"));
    },
  });

  const removeFile = (id: string) => setFiles((p) => p.filter((f) => f.id !== id));
  const clearDone  = () => setFiles((p) => p.filter((f) => f.status !== "done" && f.status !== "error"));
  const pendingCount = files.filter((f) => f.status !== "done" && f.status !== "error").length;

  return (
    <div className="space-y-6">
      {/* Document type selector */}
      <div>
        <p className="section-label mb-3">Document Type</p>
        <div className="grid grid-cols-5 gap-2">
          {RECORD_TYPES.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDocType(value)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all",
                docType === value
                  ? "border-brand-blue bg-blue-50 text-brand-blue shadow-blue-glow"
                  : "border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50"
              )}
            >
              <Icon size={17} className={docType === value ? "text-brand-blue" : "text-slate-400"} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Optional metadata */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="section-label block mb-1.5">
            Hospital / Clinic <span className="text-slate-400 font-normal normal-case">(optional)</span>
          </label>
          <input
            type="text"
            value={hospitalName}
            onChange={(e) => setHospitalName(e.target.value)}
            placeholder="e.g. Apollo Hospitals"
            className="hw-input"
          />
        </div>
        <div>
          <label className="section-label block mb-1.5">
            Doctor Name <span className="text-slate-400 font-normal normal-case">(optional)</span>
          </label>
          <input
            type="text"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            placeholder="e.g. Dr. Sharma"
            className="hw-input"
          />
        </div>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200",
          isDragActive
            ? "border-brand-blue bg-blue-50 scale-[1.01]"
            : "border-slate-200 hover:border-brand-blue/40 hover:bg-slate-50"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors",
            isDragActive ? "bg-blue-100" : "bg-slate-100"
          )}>
            <Upload size={28} className={isDragActive ? "text-brand-blue" : "text-slate-400"} />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-base">
              {isDragActive ? "Drop files here" : "Drag & drop your health documents"}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Lab reports, prescriptions, scan images, discharge summaries
            </p>
            <p className="text-xs text-slate-400 mt-0.5">PDF or images (JPG, PNG, WebP) · Max 50 MB · Handwritten supported</p>
          </div>
          <button
            type="button"
            className="btn-primary"
          >
            <Upload size={14} />
            Browse Files
          </button>
        </div>
      </div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-slate-700">
                {pendingCount > 0 ? `${pendingCount} processing…` : `${files.length} file${files.length > 1 ? "s" : ""} uploaded`}
              </p>
              {files.some((f) => f.status === "done" || f.status === "error") && (
                <button onClick={clearDone} className="text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors">
                  Clear completed
                </button>
              )}
            </div>

            {files.map((f) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 border",
                  f.status === "done"  ? "bg-emerald-50 border-emerald-100" :
                  f.status === "error" ? "bg-red-50 border-red-100" :
                  "bg-slate-50 border-slate-100"
                )}
              >
                <div className="shrink-0">
                  {f.file.type.startsWith("image/")
                    ? <ImageIcon size={16} className="text-brand-blue" />
                    : <FileText size={16} className="text-red-500" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{f.file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className={cn(
                      "text-xs font-medium",
                      f.status === "done"  ? "text-emerald-600" :
                      f.status === "error" ? "text-red-500" :
                      "text-slate-500"
                    )}>
                      {f.error || STATUS_LABEL[f.status]}
                    </p>
                    {(f.status === "uploading" || f.status === "processing") && (
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-brand-blue rounded-full"
                          animate={{ width: `${f.progress}%` }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {f.status === "done"  && <CheckCircle2 size={16} className="text-emerald-500" />}
                  {f.status === "error" && <XCircle size={16} className="text-red-500" />}
                  {(f.status === "uploading" || f.status === "processing") && (
                    <Loader2 size={16} className="text-brand-blue animate-spin" />
                  )}
                  {(f.status === "done" || f.status === "error") && (
                    <button onClick={() => removeFile(f.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                      <X size={13} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Lock size={12} className="shrink-0" />
        All documents are AES-256 encrypted in transit and at rest. Only you can access your records.
      </div>
    </div>
  );
}
