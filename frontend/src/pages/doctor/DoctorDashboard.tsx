import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, FileText, TrendingUp, Bell, ArrowRight, AlertCircle, Activity } from "lucide-react";
import { doctorApi, notificationsApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

export function DoctorDashboard() {
  const { user } = useAuthStore();
  const first = user?.profile?.first_name || "Doctor";

  const { data: patientsData, isLoading: loadingPatients } = useQuery({
    queryKey: ["doctor-patients"],
    queryFn: () => doctorApi.listPatients(),
    staleTime: 5 * 60_000,
  });

  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(true),
    staleTime: 60_000,
  });

  const patients = patientsData?.data || [];
  const notifications = notifData?.data || [];

  // Patients with critical alerts
  const criticalPatients = patients.filter((p: any) =>
    p.chronic_conditions?.length > 0
  ).slice(0, 3);

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Good morning, Dr. {first}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Here's your patient overview for today
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[
          {
            icon: Users,
            label: "Active Patients",
            value: loadingPatients ? "–" : patients.length,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            icon: FileText,
            label: "New Notifications",
            value: notifications.length,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            icon: Activity,
            label: "Consents Active",
            value: loadingPatients ? "–" : patients.length,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Patient list */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-extrabold text-slate-900">Recent Patients</h2>
            <Link to="/doctor/patients" className="flex items-center gap-1 text-xs text-brand-blue font-semibold hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {loadingPatients ? (
            <div className="space-y-3">
              {[1,2,3].map((i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                <Users size={20} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-1">No patients yet</p>
              <p className="text-xs text-slate-400 max-w-xs">
                Patients will appear here once they share their health records with you. Share your doctor email with patients to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {patients.slice(0, 6).map((p: any) => (
                <Link
                  key={p.patient_id}
                  to={`/doctor/patients/${p.patient_id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {(p.name || "P").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.name}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {p.blood_group ? `Blood: ${p.blood_group}` : ""}{p.chronic_conditions?.length > 0 ? ` · ${p.chronic_conditions[0]}` : ""}
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-brand-blue transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-extrabold text-slate-900">Notifications</h2>
            <Bell size={14} className="text-slate-400" />
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell size={24} className="text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">No new notifications</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 5).map((n: any) => (
                <div key={n.id} className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                  <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
