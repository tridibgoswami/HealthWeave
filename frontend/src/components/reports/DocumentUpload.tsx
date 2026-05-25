/**
 * HealthWeave – Document Upload Component
 * Drag-and-drop uploader for health documents with OCR feedback.
 */

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Image,
  CheckCircle,
  XCircle,
  Loader2,
  X,
} from "lucide-react";
import { recordsApi } from "../../services/api";
import { cn } from "../../utils/cn";

interface UploadFile {
  file: File;
  status: "pending" | "uploading" | "processing" | "done" | "error";
  progress: number;
  recordId?: string;
  error?: string;
}

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export function DocumentUpload({ onUploadComplete }: { onUploadComplete?: () => void }) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((f) => ({
      file: f,
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((_, i) => uploadFile(files.length + i, acceptedFiles[i]));
  }, [files.length]);

  const uploadFile = async (index: number, file: File) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, status: "uploading", progress: 30 } : f))
    );

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(/\.[^.]+$/, ""));

    try {
      setFiles((prev) =>
        prev.map((f, i) => (i === index ? { ...f, progress: 60 } : f))
      );

      const res = await recordsApi.upload(formData);

      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? { ...f, status: "processing", progress: 80, recordId: res.data.record_id }
            : f
        )
      );

      // Simulate processing completion after a short delay
      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index ? { ...f, status: "done", progress: 100 } : f
          )
        );
        onUploadComplete?.();
      }, 2000);
    } catch (err: any) {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? { ...f, status: "error", error: err.response?.data?.detail || "Upload failed" }
            : f
        )
      );
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  });

  const FileIcon = ({ mime }: { mime: string }) =>
    mime.startsWith("image/") ? (
      <Image size={16} className="text-blue-500" />
    ) : (
      <FileText size={16} className="text-red-500" />
    );

  const StatusIcon = ({ status }: { status: UploadFile["status"] }) => {
    if (status === "done") return <CheckCircle size={16} className="text-emerald-500" />;
    if (status === "error") return <XCircle size={16} className="text-red-500" />;
    if (status === "uploading" || status === "processing")
      return <Loader2 size={16} className="text-blue-500 animate-spin" />;
    return null;
  };

  const statusLabel: Record<UploadFile["status"], string> = {
    pending: "Queued",
    uploading: "Uploading…",
    processing: "AI analyzing…",
    done: "Ready",
    error: "Failed",
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200",
          isDragging
            ? "border-blue-400 bg-blue-50"
            : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
              isDragging ? "bg-blue-100" : "bg-gray-100"
            )}
          >
            <Upload
              size={24}
              className={isDragging ? "text-blue-500" : "text-gray-400"}
            />
          </div>
          <div>
            <p className="font-semibold text-gray-800">
              {isDragging ? "Drop to upload" : "Upload health documents"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Lab reports, prescriptions, scans, discharge summaries
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              PDF or images · Max 50 MB · Handwritten supported
            </p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors font-medium">
            Choose Files
          </button>
        </div>
      </div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-2"
          >
            {files.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2"
              >
                <FileIcon mime={f.file.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {f.file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p
                      className={cn(
                        "text-xs",
                        f.status === "done"
                          ? "text-emerald-600"
                          : f.status === "error"
                          ? "text-red-500"
                          : "text-gray-500"
                      )}
                    >
                      {f.error || statusLabel[f.status]}
                    </p>
                    {(f.status === "uploading" || f.status === "processing") && (
                      <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-blue-500 rounded-full"
                          animate={{ width: `${f.progress}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <StatusIcon status={f.status} />
                {(f.status === "done" || f.status === "error") && (
                  <button
                    onClick={() => removeFile(i)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-xs text-center text-gray-400">
        Documents are encrypted and stored securely. Only you can access them.
      </p>
    </div>
  );
}
