import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Users, Building2, ArrowRight, UserPlus, CheckCircle, AlertCircle } from "lucide-react";
import { orgApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";

export function AdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [createForm, setCreateForm] = useState({ name: "", city: "", state: "", phone: "" });
  const [showCreate, setShowCreate] = useState(false);

  const { data: orgData, isLoading: loadingOrg } = useQuery({
    queryKey: ["my-org"],
    queryFn: () => orgApi.getMyOrg(),
    retry: false,
  });

  const org = orgData?.data;

  const createMut = useMutation({
    mutationFn: () => orgApi.create(createForm),
    onSuccess: () => {
      toast.success("Organization created!");
      qc.invalidateQueries({ queryKey: ["my-org"] });
      setShowCreate(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to create"),
  });

  // Stats
  const { data: statsData } = useQuery({
    queryKey: ["org-stats", org?.id],
    queryFn: () => orgApi.getStats(org!.id),
    enabled: !!org?.id,
  });
  const stats = statsData?.data;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Welcome, {user?.profile?.first_name}. Manage your organization below.</p>
      </div>

      {!org && !loadingOrg && (
        <div className="bg-purple-50 border-2 border-dashed border-purple-200 rounded-2xl p-8 text-center mb-6">
          <Building2 size={40} className="text-purple-300 mx-auto mb-3" />
          <h2 className="text-base font-extrabold text-slate-800 mb-2">No Organization Yet</h2>
          <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
            Create your hospital or clinic profile to start inviting doctors and managing patients.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
          >
            Create Organization Profile
          </button>
        </div>
      )}

      {showCreate && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 mb-5">
          <h2 className="text-sm font-extrabold text-slate-900 mb-4">Create Organization</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Organization Name*</label>
              <input className="hw-input" placeholder="Apollo Hospitals, Mumbai" value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">City</label>
                <input className="hw-input" placeholder="Mumbai" value={createForm.city} onChange={(e) => setCreateForm((p) => ({ ...p, city: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">State</label>
                <input className="hw-input" placeholder="Maharashtra" value={createForm.state} onChange={(e) => setCreateForm((p) => ({ ...p, state: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
              <input className="hw-input" placeholder="+91 22 xxxx xxxx" value={createForm.phone} onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending || !createForm.name}
                className="btn-primary flex-1 bg-gradient-to-r from-purple-600 to-violet-600"
              >
                {createMut.isPending ? "Creating…" : "Create Organization"}
              </button>
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {org && (
        <>
          {/* Org info card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-5 mb-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0">
                <Building2 size={20} className="text-white" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900">{org.name}</h2>
                <p className="text-xs text-slate-500">
                  {org.org_type?.replace("_", " ")} · {org.city}{org.state ? `, ${org.state}` : ""}
                </p>
              </div>
              {org.is_verified ? (
                <span className="ml-auto flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full font-semibold">
                  <CheckCircle size={10} /> Verified
                </span>
              ) : (
                <span className="ml-auto flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full font-semibold">
                  <AlertCircle size={10} /> Pending Verification
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              { label: "Doctors", value: stats?.doctor_count ?? "–", icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Patients", value: stats?.patient_count ?? "–", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Members", value: org.member_count ?? "–", icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-card p-5">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon size={16} className={color} />
                </div>
                <p className="text-2xl font-extrabold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-4">
            <Link to="/admin/doctors" className="bg-white rounded-2xl border border-slate-100 shadow-card hover:shadow-card-hover p-5 flex items-center gap-3 group transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Users size={18} className="text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">Manage Doctors</p>
                <p className="text-xs text-slate-400">View all registered doctors</p>
              </div>
              <ArrowRight size={14} className="text-slate-300 group-hover:text-purple-500 transition-colors" />
            </Link>

            <Link to="/admin/invite" className="bg-white rounded-2xl border border-slate-100 shadow-card hover:shadow-card-hover p-5 flex items-center gap-3 group transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <UserPlus size={18} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">Invite Doctor</p>
                <p className="text-xs text-slate-400">Send invitation by email</p>
              </div>
              <ArrowRight size={14} className="text-slate-300 group-hover:text-purple-500 transition-colors" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
