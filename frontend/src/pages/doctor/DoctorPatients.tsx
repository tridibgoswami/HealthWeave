import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, Search, ArrowRight, Droplets, Heart } from "lucide-react";
import { doctorApi } from "../../services/api";

export function DoctorPatients() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["doctor-patients"],
    queryFn: () => doctorApi.listPatients(),
    staleTime: 5 * 60_000,
  });

  const patients = (data?.data || []).filter((p: any) =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.email?.includes(search)
  );

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">My Patients</h1>
        <p className="text-sm text-slate-500">Patients who have shared their health records with you</p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="hw-input pl-9"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Users size={28} className="text-slate-300" />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-2">
            {search ? "No patients match your search" : "No patients yet"}
          </h3>
          <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
            Patients can share their health records with you by entering your email address in the Consent Management section of their account.
          </p>
          <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
            Share your registered email with patients to get started
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {patients.map((p: any) => (
            <Link
              key={p.patient_id}
              to={`/doctor/patients/${p.patient_id}`}
              className="bg-white rounded-2xl border border-slate-100 shadow-card hover:shadow-card-hover transition-all p-5 flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {(p.name || "P").charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                <p className="text-xs text-slate-400 truncate">{p.email}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  {p.blood_group && p.blood_group !== "unknown" && (
                    <span className="flex items-center gap-1 text-[11px] text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-full">
                      <Droplets size={9} /> {p.blood_group}
                    </span>
                  )}
                  {p.chronic_conditions?.slice(0, 2).map((c: string) => (
                    <span key={c} className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[11px] text-slate-400">Consent granted</p>
                <p className="text-[11px] text-slate-500">{new Date(p.consent_granted).toLocaleDateString()}</p>
                {p.share_full_history && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full mt-1 inline-block">
                    Full history
                  </span>
                )}
              </div>

              <ArrowRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
