import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Send, Stethoscope, Building2, Search, CheckCircle, ChevronDown } from "lucide-react";
import { consentApi, doctorApi, orgApi } from "../services/api";
import toast from "react-hot-toast";

type TargetType = "doctor" | "hospital";

function DoctorSearch({ onSelect }: { onSelect: (d: any) => void }) {
  const [q, setQ] = useState("");
  const { data, isFetching } = useQuery({
    queryKey: ["doctor-search", q],
    queryFn: () => doctorApi.search(q),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
  const results = data?.data || [];

  return (
    <div>
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="hw-input pl-9"
          placeholder="Search by doctor name, specialization or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {isFetching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">Searching…</span>}
      </div>
      {results.length > 0 && (
        <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {results.map((d: any) => (
            <button
              key={d.user_id}
              onClick={() => { onSelect(d); setQ(""); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-slate-100 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {d.name.replace("Dr. ", "").charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{d.name}</p>
                <p className="text-xs text-slate-400">{d.specialization || d.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {q.length >= 2 && results.length === 0 && !isFetching && (
        <p className="text-xs text-slate-400 mt-2 px-1">No doctors found. Try searching by email instead.</p>
      )}
    </div>
  );
}

function HospitalSearch({ onSelect }: { onSelect: (o: any) => void }) {
  const [q, setQ] = useState("");
  const { data, isFetching } = useQuery({
    queryKey: ["hospital-search", q],
    queryFn: () => orgApi.search(q),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
  const results = data?.data || [];

  return (
    <div>
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="hw-input pl-9"
          placeholder="Search hospital or clinic by name or city…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {isFetching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">Searching…</span>}
      </div>
      {results.length > 0 && (
        <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {results.map((o: any) => (
            <button
              key={o.id}
              onClick={() => { onSelect(o); setQ(""); }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left border-b border-slate-100 last:border-0"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0">
                <Building2 size={14} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{o.name}</p>
                <p className="text-xs text-slate-400">{o.city}{o.state ? `, ${o.state}` : ""} · {o.org_type?.replace("_", " ")}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {q.length >= 2 && results.length === 0 && !isFetching && (
        <p className="text-xs text-slate-400 mt-2 px-1">No hospitals found. They may not be on HealthWeave yet.</p>
      )}
    </div>
  );
}

const SHARE_OPTIONS = [
  { key: "share_lab_reports",   label: "Lab Reports" },
  { key: "share_biomarkers",    label: "Biomarker Values" },
  { key: "share_prescriptions", label: "Prescriptions" },
  { key: "share_scans",         label: "Scans & Imaging" },
  { key: "share_full_history",  label: "Full Health History" },
];

export function SendReportPage() {
  const [targetType, setTargetType] = useState<TargetType>("doctor");
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedHospital, setSelectedHospital] = useState<any>(null);
  const [department, setDepartment] = useState("");
  const [message, setMessage] = useState("");
  const [validDays, setValidDays] = useState(30);
  const [shares, setShares] = useState({
    share_lab_reports: true,
    share_biomarkers: true,
    share_prescriptions: true,
    share_scans: false,
    share_full_history: false,
  });
  const [sent, setSent] = useState(false);

  const { data: deptData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => orgApi.getDepartments(),
    staleTime: Infinity,
  });
  const departments: string[] = deptData?.data?.departments || [];

  const mut = useMutation({
    mutationFn: () => consentApi.sendReport({
      target_type: targetType,
      doctor_email: targetType === "doctor" ? selectedDoctor?.email : undefined,
      organization_id: targetType === "hospital" ? selectedHospital?.id : undefined,
      department: targetType === "hospital" ? department : undefined,
      patient_message: message,
      valid_days: validDays,
      ...shares,
    }),
    onSuccess: () => {
      setSent(true);
      toast.success("Report sent successfully!");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to send report"),
  });

  const toggle = (k: string) => setShares((p: any) => ({ ...p, [k]: !p[k] }));

  const canSubmit =
    message.trim().length > 0 &&
    (targetType === "doctor" ? !!selectedDoctor : !!selectedHospital) &&
    Object.values(shares).some(Boolean);

  if (sent) {
    return (
      <div className="p-8 max-w-2xl">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-card p-10 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={30} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">Report Sent!</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            Your health records have been shared
            {targetType === "doctor" && selectedDoctor ? ` with ${selectedDoctor.name}` : ""}
            {targetType === "hospital" && selectedHospital ? ` with ${selectedHospital.name}${department ? ` — ${department}` : ""}` : ""}.
            They will be notified and can view your records for {validDays} days.
          </p>
          <button
            onClick={() => { setSent(false); setSelectedDoctor(null); setSelectedHospital(null); setMessage(""); setDepartment(""); }}
            className="btn-primary"
          >
            Send Another Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-7">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Send size={18} className="text-brand-blue" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Send Report to Doctor / Hospital</h1>
        </div>
        <p className="text-sm text-slate-400 ml-[52px]">Share your health records and describe your current issues</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-card p-6 space-y-6">

        {/* Target type toggle */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Send to</label>
          <div className="flex gap-2">
            <button
              onClick={() => setTargetType("doctor")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                targetType === "doctor"
                  ? "border-brand-blue bg-blue-50 text-brand-blue"
                  : "border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              <Stethoscope size={16} /> Specific Doctor
            </button>
            <button
              onClick={() => setTargetType("hospital")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                targetType === "hospital"
                  ? "border-purple-600 bg-purple-50 text-purple-600"
                  : "border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              <Building2 size={16} /> Hospital / Clinic
            </button>
          </div>
        </div>

        {/* Doctor search */}
        {targetType === "doctor" && (
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Find Doctor*</label>
            {selectedDoctor ? (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {selectedDoctor.name.replace("Dr. ", "").charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{selectedDoctor.name}</p>
                  <p className="text-xs text-slate-500">{selectedDoctor.specialization || selectedDoctor.email}</p>
                </div>
                <button onClick={() => setSelectedDoctor(null)} className="text-xs text-red-500 hover:text-red-700 font-semibold">Change</button>
              </div>
            ) : (
              <DoctorSearch onSelect={setSelectedDoctor} />
            )}
          </div>
        )}

        {/* Hospital search */}
        {targetType === "hospital" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Find Hospital / Clinic*</label>
              {selectedHospital ? (
                <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0">
                    <Building2 size={14} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{selectedHospital.name}</p>
                    <p className="text-xs text-slate-500">{selectedHospital.city}</p>
                  </div>
                  <button onClick={() => setSelectedHospital(null)} className="text-xs text-red-500 hover:text-red-700 font-semibold">Change</button>
                </div>
              ) : (
                <HospitalSearch onSelect={setSelectedHospital} />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Department</label>
              <select className="hw-input" value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">Select department (optional)…</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Patient message */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
            Your Current Health Issues / Message*
          </label>
          <textarea
            className="hw-input resize-none"
            rows={4}
            placeholder="Describe your current symptoms, concerns, or the reason you're sharing these reports. E.g. 'I've been experiencing chest pain for 3 days and shortness of breath during mild activity…'"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <p className="text-[11px] text-slate-400 mt-1">{message.length} / 500 characters</p>
        </div>

        {/* What to share */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Records to Share</label>
          <div className="grid grid-cols-2 gap-2">
            {SHARE_OPTIONS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                <div
                  onClick={() => toggle(key)}
                  className={`w-9 h-5 rounded-full transition-colors flex items-center cursor-pointer ${(shares as any)[key] ? "bg-brand-blue" : "bg-slate-200"}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${(shares as any)[key] ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
                <span className="text-xs text-slate-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Validity */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
            Share for {validDays} days
          </label>
          <input
            type="range" min={7} max={90} step={7}
            value={validDays}
            onChange={(e) => setValidDays(Number(e.target.value))}
            className="w-full accent-brand-blue"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>7 days</span><span>30 days</span><span>60 days</span><span>90 days</span>
          </div>
        </div>

        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !canSubmit}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send size={15} />
          {mut.isPending ? "Sending…" : "Send Report"}
        </button>

        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          You can revoke access at any time from <strong>My Consents</strong>. Per DPDP 2023, only the selected recipient can view your records.
        </p>
      </div>
    </div>
  );
}
