import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Building2, Stethoscope, Calendar, FileText, Plus, Trash2,
  ChevronDown, ChevronUp, Link as LinkIcon, X,
} from "lucide-react";
import { visitsApi, recordsApi } from "../services/api";
import { cn } from "../utils/cn";
import toast from "react-hot-toast";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  try { return format(parseISO(dateStr), "MMM d, yyyy"); } catch { return dateStr; }
}

function safeDate(str?: string) {
  if (!str) return "";
  try { return format(parseISO(str), "yyyy-MM-dd"); } catch { return ""; }
}

const SPEC_COLORS: Record<string, string> = {
  cardiology: "bg-red-100 text-red-700",
  endocrinology: "bg-amber-100 text-amber-700",
  neurology: "bg-purple-100 text-purple-700",
  orthopedics: "bg-blue-100 text-blue-700",
  gynecology: "bg-pink-100 text-pink-700",
  pediatrics: "bg-emerald-100 text-emerald-700",
  general: "bg-slate-100 text-slate-600",
};
function specBadge(spec?: string) {
  if (!spec) return "";
  const key = spec.toLowerCase();
  return SPEC_COLORS[key] || "bg-slate-100 text-slate-600";
}

// ── Visit Card ─────────────────────────────────────────────────────────────────

function VisitCard({
  visit,
  allRecords,
  onDelete,
  onLink,
  onUnlink,
}: {
  visit: any;
  allRecords: any[];
  onDelete: (id: string) => void;
  onLink: (visitId: string, recordId: string) => void;
  onUnlink: (visitId: string, recordId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showLinkPanel, setShowLinkPanel] = useState(false);

  const linkedIds = new Set((visit.records || []).map((r: any) => r.id || r.record_id));
  const unlinkableRecords = allRecords.filter((r: any) => !linkedIds.has(r.id));

  return (
    <div className="hw-card p-5 mb-4 border-l-4 border-brand-blue overflow-hidden">
      {/* Summary row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <Calendar size={11} />
              {formatDate(visit.visit_date)}
            </span>
            {visit.specialization && (
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full capitalize", specBadge(visit.specialization))}>
                {visit.specialization}
              </span>
            )}
            {visit.follow_up_date && (
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Follow-up: {formatDate(visit.follow_up_date)}
              </span>
            )}
          </div>
          {visit.doctor_name && (
            <p className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Stethoscope size={14} className="text-brand-blue shrink-0" />
              {visit.doctor_name}
            </p>
          )}
          {visit.hospital_name && (
            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Building2 size={12} className="text-slate-400 shrink-0" />
              {visit.hospital_name}
            </p>
          )}
          {visit.chief_complaint && (
            <p className="text-sm text-slate-600 mt-1.5">
              <span className="font-semibold text-slate-500 text-xs">Reason: </span>
              {visit.chief_complaint}
            </p>
          )}
          {visit.diagnosis && (
            <p className="text-sm text-slate-700 mt-0.5">
              <span className="font-semibold text-slate-500 text-xs">Diagnosis: </span>
              {visit.diagnosis}
            </p>
          )}
          {(visit.records || []).length > 0 && (
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <FileText size={11} />
              {(visit.records || []).length} linked record{(visit.records || []).length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setOpen(v => !v)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <button
            onClick={() => { if (confirm("Delete this visit?")) onDelete(visit.id); }}
            className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {open && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          {visit.notes && (
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">{visit.notes}</p>
          )}

          {/* Linked records */}
          <div className="mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText size={11} />
              Linked Records
            </p>
            {(visit.records || []).length === 0 ? (
              <p className="text-xs text-slate-400 mb-2">No records linked yet.</p>
            ) : (
              <div className="space-y-1.5 mb-2">
                {(visit.records || []).map((rec: any) => (
                  <div
                    key={rec.id || rec.record_id}
                    className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2"
                  >
                    <FileText size={12} className="text-brand-blue shrink-0" />
                    <span className="text-xs font-medium text-slate-700 flex-1 truncate">{rec.title || rec.file_name || "Record"}</span>
                    {rec.record_type && (
                      <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full capitalize">
                        {rec.record_type.replace(/_/g, " ")}
                      </span>
                    )}
                    <button
                      onClick={() => onUnlink(visit.id, rec.id || rec.record_id)}
                      className="p-1 rounded-lg text-slate-300 hover:text-red-500 transition-colors"
                      title="Unlink"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Link record panel */}
            <button
              onClick={() => setShowLinkPanel(v => !v)}
              className="text-xs font-semibold text-brand-blue hover:underline flex items-center gap-1"
            >
              <LinkIcon size={11} />
              {showLinkPanel ? "Cancel" : "Link a Record"}
            </button>

            {showLinkPanel && (
              <div className="mt-2 bg-slate-50 rounded-xl p-3">
                {unlinkableRecords.length === 0 ? (
                  <p className="text-xs text-slate-400">No more records to link.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {unlinkableRecords.slice(0, 20).map((rec: any) => (
                      <button
                        key={rec.id}
                        onClick={() => { onLink(visit.id, rec.id); setShowLinkPanel(false); }}
                        className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-xl hover:bg-white transition-colors"
                      >
                        <FileText size={12} className="text-brand-blue shrink-0" />
                        <span className="text-xs font-medium text-slate-700 flex-1 truncate">{rec.title || rec.file_name}</span>
                        {rec.record_type && (
                          <span className="text-[10px] text-slate-400 shrink-0 capitalize">{rec.record_type.replace(/_/g, " ")}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  visit_date: format(new Date(), "yyyy-MM-dd"),
  doctor_name: "",
  hospital_name: "",
  specialization: "",
  chief_complaint: "",
  diagnosis: "",
  notes: "",
  follow_up_date: "",
};

export function VisitsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: visitsData, isLoading } = useQuery({
    queryKey: ["visits"],
    queryFn: () => visitsApi.list(),
    staleTime: 60_000,
  });

  const { data: recordsData } = useQuery({
    queryKey: ["records-list"],
    queryFn: () => recordsApi.list({ page_size: 100 }),
    staleTime: 5 * 60_000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      visitsApi.create({
        visit_date: form.visit_date,
        doctor_name: form.doctor_name || undefined,
        hospital_name: form.hospital_name || undefined,
        specialization: form.specialization || undefined,
        chief_complaint: form.chief_complaint || undefined,
        diagnosis: form.diagnosis || undefined,
        notes: form.notes || undefined,
        follow_up_date: form.follow_up_date || undefined,
      }),
    onSuccess: () => {
      toast.success("Visit added!");
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["visits"] });
    },
    onError: () => toast.error("Failed to save visit"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => visitsApi.delete(id),
    onSuccess: () => {
      toast.success("Visit deleted");
      qc.invalidateQueries({ queryKey: ["visits"] });
    },
  });

  const linkMutation = useMutation({
    mutationFn: ({ visitId, recordId }: { visitId: string; recordId: string }) =>
      visitsApi.linkRecord(visitId, recordId),
    onSuccess: () => {
      toast.success("Record linked!");
      qc.invalidateQueries({ queryKey: ["visits"] });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: ({ visitId, recordId }: { visitId: string; recordId: string }) =>
      visitsApi.unlinkRecord(visitId, recordId),
    onSuccess: () => {
      toast.success("Record unlinked");
      qc.invalidateQueries({ queryKey: ["visits"] });
    },
  });

  const visits: any[] = visitsData?.data?.visits || visitsData?.data || [];
  const allRecords: any[] = recordsData?.data?.records || recordsData?.data || [];

  const handleFormChange = (key: string, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <Stethoscope size={18} className="text-brand-blue" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">My Visits</h1>
          </div>
          <p className="text-sm text-slate-400 ml-[52px]">Your doctor visits and appointment history</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="btn-primary"
        >
          <Plus size={14} />
          Add Visit
        </button>
      </div>

      {/* Add Visit Form */}
      {showForm && (
        <div className="hw-card p-5 mb-6 border-2 border-brand-blue/20">
          <h2 className="text-sm font-bold text-slate-800 mb-4">New Visit</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="section-label block mb-1.5">Visit Date <span className="text-red-400">*</span></label>
              <input type="date" value={form.visit_date} onChange={e => handleFormChange("visit_date", e.target.value)} className="hw-input" />
            </div>
            <div>
              <label className="section-label block mb-1.5">Doctor Name</label>
              <input type="text" value={form.doctor_name} onChange={e => handleFormChange("doctor_name", e.target.value)} placeholder="Dr. Sharma" className="hw-input" />
            </div>
            <div>
              <label className="section-label block mb-1.5">Hospital / Clinic</label>
              <input type="text" value={form.hospital_name} onChange={e => handleFormChange("hospital_name", e.target.value)} placeholder="Apollo Hospitals" className="hw-input" />
            </div>
            <div>
              <label className="section-label block mb-1.5">Specialization</label>
              <input type="text" value={form.specialization} onChange={e => handleFormChange("specialization", e.target.value)} placeholder="Cardiology, General..." className="hw-input" />
            </div>
            <div>
              <label className="section-label block mb-1.5">Reason for Visit</label>
              <input type="text" value={form.chief_complaint} onChange={e => handleFormChange("chief_complaint", e.target.value)} placeholder="Chief complaint..." className="hw-input" />
            </div>
            <div>
              <label className="section-label block mb-1.5">Diagnosis</label>
              <input type="text" value={form.diagnosis} onChange={e => handleFormChange("diagnosis", e.target.value)} placeholder="Diagnosed condition..." className="hw-input" />
            </div>
            <div className="sm:col-span-2">
              <label className="section-label block mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => handleFormChange("notes", e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                className="hw-input resize-none"
              />
            </div>
            <div>
              <label className="section-label block mb-1.5">Follow-up Date</label>
              <input type="date" value={form.follow_up_date} onChange={e => handleFormChange("follow_up_date", e.target.value)} className="hw-input" />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!form.visit_date || createMutation.isPending}
              className="btn-primary"
            >
              {createMutation.isPending ? "Saving…" : "Save Visit"}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); }}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Visits list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
      ) : visits.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-card">
          <Stethoscope size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="font-bold text-slate-600 mb-1">No visits recorded yet</p>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            Click "Add Visit" to start logging your doctor appointments.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            {visits.length} visit{visits.length !== 1 ? "s" : ""} recorded
          </p>
          {[...visits]
            .sort((a, b) => (b.visit_date || "").localeCompare(a.visit_date || ""))
            .map((visit: any) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                allRecords={allRecords}
                onDelete={id => deleteMutation.mutate(id)}
                onLink={(visitId, recordId) => linkMutation.mutate({ visitId, recordId })}
                onUnlink={(visitId, recordId) => unlinkMutation.mutate({ visitId, recordId })}
              />
            ))}
        </div>
      )}
    </div>
  );
}
