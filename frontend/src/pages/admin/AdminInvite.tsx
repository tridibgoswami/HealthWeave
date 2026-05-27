import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { UserPlus, Copy, CheckCircle, Mail } from "lucide-react";
import { orgApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import toast from "react-hot-toast";

export function AdminInvite() {
  const { user } = useAuthStore();
  const orgId = user?.organization?.id;
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("doctor");
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const mut = useMutation({
    mutationFn: () => orgApi.inviteDoctor(orgId!, { email, role }),
    onSuccess: (res) => {
      setResult(res.data);
      setEmail("");
      toast.success("Invitation created!");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to invite"),
  });

  const copyToken = () => {
    if (result?.invite_token) {
      navigator.clipboard.writeText(`${window.location.origin}/join?token=${result.invite_token}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Invite Doctor</h1>
        <p className="text-sm text-slate-500 mt-1">Send an invitation to a doctor to join your organization</p>
      </div>

      {!orgId ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-700">
          Please create your organization first from the Dashboard.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Doctor's Email Address*</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="hw-input pl-9"
                  type="email"
                  placeholder="doctor@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role</label>
              <select className="hw-input" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="doctor">Doctor</option>
                <option value="hospital_admin">Hospital Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 leading-relaxed">
              The invited person will receive a token they can use to join your organization. They can be an existing HealthWeave user or create a new account.
            </div>

            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || !email || !orgId}
              className="btn-primary w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
            >
              <UserPlus size={15} />
              {mut.isPending ? "Sending…" : "Generate Invitation"}
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-emerald-600" />
            <p className="text-sm font-bold text-emerald-800">Invitation Generated</p>
          </div>
          <p className="text-xs text-slate-600 mb-3">
            Share the link below with <strong>{result.email}</strong>. It expires in {result.expires_in_days} days.
          </p>
          <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-xl p-3">
            <code className="text-xs text-slate-700 flex-1 truncate">
              {window.location.origin}/join?token={result.invite_token}
            </code>
            <button
              onClick={copyToken}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors shrink-0"
            >
              {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Token: <code className="bg-white px-1 rounded">{result.invite_token}</code>
          </p>
        </div>
      )}
    </div>
  );
}
