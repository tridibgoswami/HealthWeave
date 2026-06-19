import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Heart, Activity, FileText, PlusCircle,
  AlertCircle, TrendingUp, Pill, FlaskConical, ChevronDown, ChevronUp,
} from "lucide-react";
import { doctorApi } from "../../services/api";
import { AiNarrative } from "../../components/AiNarrative";
import toast from "react-hot-toast";

const RISK_COLOR: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high:     "bg-orange-100 text-orange-700 border-orange-200",
  moderate: "bg-amber-100 text-amber-700 border-amber-200",
  low:      "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function NoteForm({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    chief_complaint: "", clinical_findings: "", diagnosis: "",
    treatment_plan: "", follow_up_date: "", visit_date: new Date().toISOString().split("T")[0],
  });

  const mut = useMutation({
    mutationFn: () => doctorApi.addClinicalNote(patientId, form),
    onSuccess: () => {
      toast.success("Clinical note saved");
      qc.invalidateQueries({ queryKey: ["doctor-notes", patientId] });
      onClose();
    },
    onError: () => toast.error("Failed to save note"),
  });

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-4">
      <h3 className="text-sm font-extrabold text-slate-900 mb-4">Add Clinical Note</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Visit Date</label>
          <input type="date" className="hw-input" value={form.visit_date} onChange={(e) => setForm((p) => ({ ...p, visit_date: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Chief Complaint</label>
          <input className="hw-input" placeholder="Patient's main complaint…" value={form.chief_complaint} onChange={(e) => setForm((p) => ({ ...p, chief_complaint: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Clinical Findings</label>
          <textarea className="hw-input resize-none" rows={2} placeholder="Examination findings…" value={form.clinical_findings} onChange={(e) => setForm((p) => ({ ...p, clinical_findings: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Diagnosis</label>
          <input className="hw-input" placeholder="Primary diagnosis…" value={form.diagnosis} onChange={(e) => setForm((p) => ({ ...p, diagnosis: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Treatment Plan</label>
          <textarea className="hw-input resize-none" rows={2} placeholder="Treatment, medications, advice…" value={form.treatment_plan} onChange={(e) => setForm((p) => ({ ...p, treatment_plan: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Follow-up Date</label>
          <input type="date" className="hw-input" value={form.follow_up_date} onChange={(e) => setForm((p) => ({ ...p, follow_up_date: e.target.value }))} />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => mut.mutate()} disabled={mut.isPending} className="btn-primary flex-1">
            {mut.isPending ? "Saving…" : "Save Note"}
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function DoctorPatientView() {
  const { patientId } = useParams<{ patientId: string }>();
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "records" | "notes" | "biomarkers">("overview");

  const { data, isLoading } = useQuery({
    queryKey: ["doctor-patient", patientId],
    queryFn: () => doctorApi.getPatientSummary(patientId!),
    staleTime: 2 * 60_000,
    enabled: !!patientId,
  });

  const { data: notesData } = useQuery({
    queryKey: ["doctor-notes", patientId],
    queryFn: () => doctorApi.listClinicalNotes(patientId!),
    enabled: !!patientId && activeTab === "notes",
  });

  const { data: biomarkersData } = useQuery({
    queryKey: ["doctor-biomarkers", patientId],
    queryFn: () => doctorApi.getPatientBiomarkers(patientId!),
    enabled: !!patientId && activeTab === "biomarkers",
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="space-y-4">
          {[1,2,3].map((i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  const d = data?.data;
  if (!d) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertCircle size={24} className="text-red-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-red-700">Patient not found or no consent</p>
          <Link to="/doctor/patients" className="text-xs text-brand-blue hover:underline mt-2 inline-block">← Back to patients</Link>
        </div>
      </div>
    );
  }

  const { patient, health_score, alerts, recent_records } = d;
  const score = health_score?.overall;

  const TABS = [
    { key: "overview",    label: "Overview" },
    { key: "records",     label: "Records" },
    { key: "notes",       label: "Clinical Notes" },
    { key: "biomarkers",  label: "Biomarkers" },
  ];

  return (
    <div className="p-8 max-w-5xl">
      {/* Back + header */}
      <Link to="/doctor/patients" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors">
        <ArrowLeft size={14} /> Back to patients
      </Link>

      {/* Patient header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 mb-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-extrabold text-lg shrink-0">
          {patient.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-slate-900">{patient.name}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {patient.blood_group && patient.blood_group !== "unknown" && (
              <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                {patient.blood_group}
              </span>
            )}
            {patient.gender && (
              <span className="text-xs text-slate-500">{patient.gender}</span>
            )}
            {patient.date_of_birth && (
              <span className="text-xs text-slate-500">
                DOB: {patient.date_of_birth}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          {score !== null && score !== undefined && (
            <div>
              <p className="text-3xl font-extrabold text-slate-900">{Math.round(score)}</p>
              <p className="text-[11px] text-slate-400">Overall Health Score</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowNoteForm((p) => !p)}
          className="flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-4 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <PlusCircle size={14} /> Add Note
        </button>
      </div>

      {showNoteForm && <NoteForm patientId={patientId!} onClose={() => setShowNoteForm(false)} />}

      {/* Quick health context */}
      {(patient.chronic_conditions?.length > 0 || patient.known_allergies?.length > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {patient.chronic_conditions?.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <p className="text-xs font-bold text-orange-700 mb-2">Chronic Conditions</p>
              <div className="flex flex-wrap gap-1.5">
                {patient.chronic_conditions.map((c: string) => (
                  <span key={c} className="text-xs bg-white border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
            </div>
          )}
          {patient.known_allergies?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs font-bold text-red-700 mb-2">Known Allergies</p>
              <div className="flex flex-wrap gap-1.5">
                {patient.known_allergies.map((a: string) => (
                  <span key={a} className="text-xs bg-white border border-red-200 text-red-600 px-2 py-0.5 rounded-full">{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5 w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Health scores */}
          {health_score && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
              <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                <Activity size={14} className="text-emerald-500" /> Organ Health Scores
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Heart", value: health_score.heart },
                  { label: "Kidney", value: health_score.kidney },
                  { label: "Liver", value: health_score.liver },
                  { label: "Metabolic", value: health_score.metabolic },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center p-3 bg-slate-50 rounded-xl">
                    <p className="text-xl font-extrabold text-slate-800">{value ? Math.round(value) : "–"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {health_score.ai_narrative && (
                <AiNarrative raw={health_score.ai_narrative} className="mt-4" />
              )}
            </div>
          )}

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
              <h3 className="text-sm font-extrabold text-slate-800 mb-3 flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-500" /> Active Health Alerts
              </h3>
              <div className="space-y-2">
                {alerts.map((a: any, i: number) => (
                  <div key={i} className={`border rounded-xl p-3 ${RISK_COLOR[a.risk_level] || "bg-slate-50 border-slate-200"}`}>
                    <p className="text-xs font-bold">{a.title}</p>
                    <p className="text-[11px] mt-0.5 opacity-80">{a.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "records" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
          <h3 className="text-sm font-extrabold text-slate-800 mb-4">Recent Health Records</h3>
          {recent_records.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No records available (based on consent settings)</p>
          ) : (
            <div className="space-y-2">
              {recent_records.map((r: any) => (
                <div key={r.id} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{r.title}</p>
                      <p className="text-xs text-slate-400">{r.date} · {r.hospital || "Unknown facility"}</p>
                      {r.ai_tags?.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {r.ai_tags.slice(0, 3).map((t: string) => (
                            <span key={t} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-medium">{r.type?.replace("_", " ")}</span>
                  </div>
                  {r.ai_summary && (
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-2">{r.ai_summary}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "notes" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
          <h3 className="text-sm font-extrabold text-slate-800 mb-4">Clinical Notes</h3>
          {!notesData?.data?.length ? (
            <div className="text-center py-10">
              <FileText size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No clinical notes yet</p>
              <button onClick={() => setShowNoteForm(true)} className="mt-3 text-xs text-emerald-600 font-semibold hover:underline">
                Add first note
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {notesData.data.map((n: any) => (
                <div key={n.id} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-700">Visit: {n.visit_date}</p>
                    <span className="text-[11px] text-slate-400">{n.doctor}</span>
                  </div>
                  {n.chief_complaint && <p className="text-xs text-slate-600 mb-1"><span className="font-semibold">Complaint:</span> {n.chief_complaint}</p>}
                  {n.diagnosis && <p className="text-xs text-slate-600 mb-1"><span className="font-semibold">Diagnosis:</span> {n.diagnosis}</p>}
                  {n.treatment_plan && <p className="text-xs text-slate-600"><span className="font-semibold">Plan:</span> {n.treatment_plan}</p>}
                  {n.follow_up_date && <p className="text-xs text-emerald-600 mt-1.5 font-semibold">Follow-up: {n.follow_up_date}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "biomarkers" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
          <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
            <FlaskConical size={14} className="text-blue-500" /> Biomarker History
          </h3>
          {!biomarkersData?.data?.biomarkers || Object.keys(biomarkersData.data.biomarkers).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No biomarker data available</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(biomarkersData.data.biomarkers).map(([name, values]: [string, any]) => (
                <div key={name} className="border border-slate-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-700 mb-2">{name}</p>
                  <div className="flex gap-2 flex-wrap">
                    {values.slice(-5).map((v: any, i: number) => (
                      <div key={i} className={`text-center px-3 py-2 rounded-lg text-xs ${
                        v.status === "high" ? "bg-red-50 border border-red-200" :
                        v.status === "low"  ? "bg-blue-50 border border-blue-200" :
                        "bg-slate-50 border border-slate-200"
                      }`}>
                        <p className="font-bold text-slate-800">{v.value} {v.unit}</p>
                        <p className="text-[10px] text-slate-400">{v.date}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
