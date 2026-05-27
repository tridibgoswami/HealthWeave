import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, UserPlus, ArrowRight, Stethoscope } from "lucide-react";
import { orgApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

export function AdminDoctors() {
  const { user } = useAuthStore();
  const orgId = user?.organization?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: () => orgApi.listMembers(orgId!),
    enabled: !!orgId,
  });

  const members = data?.data || [];

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Doctors</h1>
          <p className="text-sm text-slate-500 mt-1">All doctors registered in your organization</p>
        </div>
        <Link
          to="/admin/invite"
          className="flex items-center gap-2 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 px-4 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <UserPlus size={15} /> Invite Doctor
        </Link>
      </div>

      {!orgId ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-sm text-amber-700">
          You need to create your organization first.{" "}
          <Link to="/admin/dashboard" className="font-semibold underline">Go to dashboard</Link>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <Stethoscope size={36} className="text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-600 mb-2">No doctors yet</h3>
          <p className="text-sm text-slate-400 mb-5 max-w-xs mx-auto">
            Invite doctors to your organization. They'll receive an invitation email with a link to join.
          </p>
          <Link
            to="/admin/invite"
            className="btn-primary bg-gradient-to-r from-purple-600 to-violet-600"
          >
            Send First Invitation
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((m: any) => (
            <div key={m.member_id} className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {(m.name || "D").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm">{m.name}</p>
                <p className="text-xs text-slate-400">{m.email}</p>
                {m.department && <p className="text-xs text-slate-400 mt-0.5">{m.department}</p>}
              </div>
              <div className="text-right">
                <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                  m.role === "hospital_admin"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}>
                  {m.role === "hospital_admin" ? "Admin" : "Doctor"}
                </span>
                <p className="text-[11px] text-slate-400 mt-1">Joined {new Date(m.joined_at).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
