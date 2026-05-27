import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, PlusCircle, Trash2, User, Lock, Unlock } from "lucide-react";
import { consentApi } from "../services/api";
import toast from "react-hot-toast";

function GrantConsentForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    doctor_email: "",
    share_full_history: false,
    share_biomarkers: true,
    share_prescriptions: true,
    share_lab_reports: true,
    share_scans: false,
    valid_days: "" as string | number,
    purpose: "",
  });

  const mut = useMutation({
    mutationFn: () => consentApi.grantConsent({
      ...form,
      valid_days: form.valid_days ? Number(form.valid_days) : undefined,
    }),
    onSuccess: () => {
      toast.success("Access granted to doctor");
      qc.invalidateQueries({ queryKey: ["my-consents"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to grant consent"),
  });

  const toggle = (k: string) => setForm((p: any) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-5">
      <h3 className="text-sm font-extrabold text-slate-900 mb-4">Share Records with a Doctor</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Doctor's Email Address*</label>
          <input className="hw-input" type="email" placeholder="doctor@hospital.com" value={form.doctor_email} onChange={(e) => setForm((p) => ({ ...p, doctor_email: e.target.value }))} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">What to share</label>
          <div className="space-y-2">
            {[
              { key: "share_biomarkers", label: "Biomarkers & Lab Values" },
              { key: "share_lab_reports", label: "Lab Reports" },
              { key: "share_prescriptions", label: "Prescriptions" },
              { key: "share_scans", label: "Scans & Imaging" },
              { key: "share_full_history", label: "Full Health History (all records)" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                <div
                  onClick={() => toggle(key)}
                  className={`w-9 h-5 rounded-full transition-colors flex items-center ${(form as any)[key] ? "bg-brand-blue" : "bg-slate-200"}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${(form as any)[key] ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
                <span className="text-xs text-slate-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Valid for (days) — leave blank for indefinite</label>
          <input className="hw-input" type="number" min="1" placeholder="e.g. 90" value={form.valid_days} onChange={(e) => setForm((p) => ({ ...p, valid_days: e.target.value }))} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Purpose (optional)</label>
          <input className="hw-input" placeholder="e.g. Pre-surgery consultation" value={form.purpose} onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))} />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={() => mut.mutate()} disabled={mut.isPending || !form.doctor_email} className="btn-primary flex-1">
            {mut.isPending ? "Granting…" : "Grant Access"}
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConsentPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["my-consents"],
    queryFn: () => consentApi.listConsents(),
    staleTime: 2 * 60_000,
  });

  const revokeMut = useMutation({
    mutationFn: (consentId: string) => consentApi.revokeConsent(consentId),
    onSuccess: () => {
      toast.success("Access revoked");
      qc.invalidateQueries({ queryKey: ["my-consents"] });
    },
    onError: () => toast.error("Failed to revoke"),
  });

  const consents = data?.data || [];

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <ShieldCheck size={18} className="text-brand-blue" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Consent Management</h1>
        </div>
        <p className="text-sm text-slate-400 ml-[52px]">Control who can see your health records — DPDP 2023 compliant</p>
      </div>

      {/* Add new */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-brand-blue to-cyan-500 hover:from-blue-700 hover:to-cyan-600 px-4 py-2.5 rounded-xl mb-5 transition-all shadow-sm"
        >
          <PlusCircle size={15} /> Share with a Doctor
        </button>
      ) : (
        <GrantConsentForm onClose={() => setShowForm(false)} />
      )}

      {/* Existing consents */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-card p-5">
        <h2 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
          <Unlock size={14} className="text-brand-blue" /> Active Consents
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : consents.length === 0 ? (
          <div className="text-center py-10">
            <Lock size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-500 mb-1">No active consents</p>
            <p className="text-xs text-slate-400">Your health records are private. Share with a doctor above when needed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {consents.map((c: any) => (
              <div key={c.consent_id} className="border border-slate-100 rounded-xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {(c.doctor_name || "D").replace("Dr. ", "").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{c.doctor_name}</p>
                  <p className="text-xs text-slate-400">{c.doctor_email}</p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {c.share_full_history && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Full History</span>}
                    {c.share_biomarkers  && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Biomarkers</span>}
                    {c.share_lab_reports && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Lab Reports</span>}
                    {c.share_prescriptions && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Prescriptions</span>}
                    {c.share_scans       && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Scans</span>}
                  </div>
                  {c.purpose && <p className="text-[11px] text-slate-400 mt-1 italic">"{c.purpose}"</p>}
                  {c.valid_until && <p className="text-[11px] text-amber-600 mt-1">Expires: {c.valid_until}</p>}
                </div>
                <button
                  onClick={() => revokeMut.mutate(c.consent_id)}
                  disabled={revokeMut.isPending}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Trash2 size={12} /> Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
        <strong className="text-slate-700">Your data, your control.</strong> Under DPDP 2023, you have the right to grant and revoke access to your health records at any time. Doctors can only view records you've explicitly shared.
      </div>
    </div>
  );
}
