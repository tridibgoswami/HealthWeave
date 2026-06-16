import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Trash2, ChevronDown, ChevronUp, CheckCircle,
  AlertTriangle, Loader2, Upload, RefreshCw, Search, Filter,
  FlaskConical, Pill, ScanLine, Stethoscope, ClipboardList, Activity,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { recordsApi } from "../services/api";
import { cn } from "../utils/cn";
import toast from "react-hot-toast";

const TYPE_ICON: Record<string, React.ElementType> = {
  lab_report:          FlaskConical,
  prescription:        Pill,
  imaging:             ScanLine,
  discharge_summary:   ClipboardList,
  consultation:        Stethoscope,
  vaccination:         Activity,
  other:               FileText,
};

const TYPE_COLOR: Record<string, string> = {
  lab_report:          "bg-blue-100 text-blue-600",
  prescription:        "bg-purple-100 text-purple-600",
  imaging:             "bg-amber-100 text-amber-600",
  discharge_summary:   "bg-red-100 text-red-600",
  consultation:        "bg-teal-100 text-teal-600",
  vaccination:         "bg-emerald-100 text-emerald-600",
  other:               "bg-slate-100 text-slate-500",
};

const STATUS_BADGE: Record<string, string> = {
  processed:  "bg-emerald-100 text-emerald-700",
  processing: "bg-amber-100 text-amber-700",
  failed:     "bg-red-100 text-red-700",
};

const RECORD_TYPES = [
  { value: "", label: "All types" },
  { value: "lab_report",        label: "Lab Report" },
  { value: "prescription",      label: "Prescription" },
  { value: "imaging",           label: "Imaging / Scan" },
  { value: "discharge_summary", label: "Discharge Summary" },
  { value: "consultation",      label: "Consultation" },
  { value: "vaccination",       label: "Vaccination" },
  { value: "other",             label: "Other" },
];

function DeleteConfirmModal({
  record,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  record: any;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Trash2 size={20} className="text-red-600" />
        </div>
        <h3 className="text-base font-bold text-slate-900 text-center mb-1">Delete record?</h3>
        <p className="text-sm text-slate-500 text-center mb-1">
          <span className="font-semibold text-slate-700">{record.title}</span>
        </p>
        <p className="text-xs text-slate-400 text-center mb-6">
          This permanently removes the record, all extracted biomarkers, and the uploaded file. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function KeyFindingsPanel({ findings, riskFlags, summary }: { findings: string[]; riskFlags: string[]; summary?: string }) {
  if (findings.length === 0 && !summary && riskFlags.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic py-2">
        No AI summary available for this record yet.
      </p>
    );
  }

  return (
    <div className="space-y-3 mt-2">
      {findings.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">AI Summary</p>
          <ul className="space-y-2.5">
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

      {findings.length === 0 && summary && (
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">AI Summary</p>
          <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
        </div>
      )}

      {riskFlags.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide mb-1">Areas to watch</p>
            <ul className="space-y-0.5">
              {riskFlags.map((flag, i) => (
                <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                  <span className="mt-0.5 shrink-0">•</span>{flag}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function RecordRow({
  record,
  onDelete,
}: {
  record: any;
  onDelete: (record: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detailLoaded, setDetailLoaded] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const Icon = TYPE_ICON[record.record_type] || FileText;
  const typeColor = TYPE_COLOR[record.record_type] || TYPE_COLOR.other;
  const statusBadge = STATUS_BADGE[record.document_status || "processing"] || STATUS_BADGE.processing;
  const statusLabel =
    record.document_status === "processed"  ? "Analysed" :
    record.document_status === "failed"     ? "Failed" : "Processing";

  const handleExpand = async () => {
    if (!expanded && !detailLoaded) {
      setLoadingDetail(true);
      try {
        const res = await recordsApi.get(record.id);
        setDetail(res.data);
        setDetailLoaded(true);
      } catch {
        // silently fail — show what we have
      } finally {
        setLoadingDetail(false);
      }
    }
    setExpanded((v) => !v);
  };

  const findings: string[] = detail?.key_findings ?? [];
  const riskFlags: string[] = detail?.ai_risk_flags ?? [];
  const summary: string = detail?.ai_summary ?? "";
  const biomarkerCount: number = detail?.biomarkers?.length ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      {/* Row header */}
      <div className="flex items-center gap-3 p-4">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", typeColor)}>
          <Icon size={16} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{record.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] text-slate-400">
              {record.record_date ? format(new Date(record.record_date), "dd MMM yyyy") : "—"}
            </span>
            {record.hospital_name && (
              <>
                <span className="text-slate-200">·</span>
                <span className="text-[11px] text-slate-400 truncate max-w-[140px]">{record.hospital_name}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", statusBadge)}>
            {statusLabel}
          </span>
          <button
            onClick={handleExpand}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-brand-blue hover:bg-blue-50 transition-colors"
            title={expanded ? "Collapse" : "View AI summary"}
          >
            {loadingDetail ? (
              <Loader2 size={13} className="animate-spin" />
            ) : expanded ? (
              <ChevronUp size={15} />
            ) : (
              <ChevronDown size={15} />
            )}
          </button>
          <button
            onClick={() => onDelete(record)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete record"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Expanded: AI summary */}
      {expanded && (
        <div className="border-t border-slate-50 px-4 pb-4 pt-3">
          {detailLoaded && (
            <div className="flex items-center gap-3 mb-3">
              {biomarkerCount > 0 && (
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-blue bg-blue-50 px-2.5 py-1 rounded-full">
                  <CheckCircle size={11} /> {biomarkerCount} biomarker{biomarkerCount !== 1 ? "s" : ""} extracted
                </span>
              )}
              {detail?.record_type && (
                <span className="text-[11px] text-slate-400 capitalize">
                  {detail.record_type.replace(/_/g, " ")}
                </span>
              )}
            </div>
          )}
          {detailLoaded ? (
            <KeyFindingsPanel findings={findings} riskFlags={riskFlags} summary={summary} />
          ) : (
            <div className="flex items-center gap-2 py-3">
              <Loader2 size={14} className="animate-spin text-slate-400" />
              <p className="text-xs text-slate-400">Loading summary…</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MyRecordsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<any>(null);

  const PAGE_SIZE = 10;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["records-list", typeFilter, page],
    queryFn: () =>
      recordsApi.list({
        record_type: typeFilter || undefined,
        page,
        page_size: PAGE_SIZE,
      }),
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => recordsApi.delete(id),
    onSuccess: () => {
      toast.success("Record deleted");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["records-list"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
      qc.invalidateQueries({ queryKey: ["health-scores"] });
    },
    onError: () => {
      toast.error("Failed to delete record. Please try again.");
    },
  });

  const records: any[] = data?.data?.records || [];
  const total: number = data?.data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = search.trim()
    ? records.filter((r) =>
        r.title?.toLowerCase().includes(search.toLowerCase()) ||
        r.hospital_name?.toLowerCase().includes(search.toLowerCase())
      )
    : records;

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <FileText size={18} className="text-brand-blue" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">My Records</h1>
            <p className="text-sm text-slate-400">
              {total > 0 ? `${total} record${total !== 1 ? "s" : ""} uploaded` : "No records yet"}
            </p>
          </div>
        </div>
        <Link to="/upload" className="btn-primary shrink-0">
          <Upload size={14} /> Upload
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or hospital…"
            className="hw-input pl-9 text-sm"
          />
        </div>
        <div className="relative">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="hw-input pl-8 pr-8 text-sm appearance-none cursor-pointer min-w-[140px]"
          >
            {RECORD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-card">
          <FileText size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="font-bold text-slate-600 mb-1">
            {search || typeFilter ? "No matching records" : "No records yet"}
          </p>
          <p className="text-sm text-slate-400 mb-5">
            {search || typeFilter
              ? "Try a different search or filter"
              : "Upload your first lab report to get started"}
          </p>
          {!search && !typeFilter && (
            <Link to="/upload" className="btn-primary inline-flex">
              <Upload size={14} /> Upload First Record
            </Link>
          )}
        </div>
      )}

      {/* Records list */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {isFetching && !isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <RefreshCw size={11} className="animate-spin" /> Refreshing…
            </div>
          )}
          {filtered.map((rec) => (
            <RecordRow key={rec.id} record={rec} onDelete={setToDelete} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-slate-400 font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {toDelete && (
        <DeleteConfirmModal
          record={toDelete}
          onConfirm={() => deleteMutation.mutate(toDelete.id)}
          onCancel={() => setToDelete(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
