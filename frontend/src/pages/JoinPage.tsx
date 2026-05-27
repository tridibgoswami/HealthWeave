import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Building2, Dna, Eye, EyeOff, CheckCircle } from "lucide-react";
import { orgApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";

export function JoinPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const { fetchMe } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);
  const [form, setForm] = useState({
    password: "", first_name: "", last_name: "",
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const mut = useMutation({
    mutationFn: () => orgApi.acceptInvitation({
      token,
      password: form.password,
      first_name: isNewUser ? form.first_name : undefined,
      last_name:  isNewUser ? form.last_name  : undefined,
    }),
    onSuccess: async (res) => {
      const { access_token, refresh_token, role } = res.data;
      localStorage.setItem("hw_access_token", access_token);
      localStorage.setItem("hw_refresh_token", refresh_token);
      await fetchMe();
      toast.success("Welcome to HealthWeave!");
      navigate(role === "hospital_admin" ? "/admin/dashboard" : "/doctor/dashboard");
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Invalid or expired invitation"),
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 text-sm">No invitation token found in URL.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
            <Dna size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">You're Invited!</h1>
          <p className="text-slate-400 text-sm mt-2">Accept your invitation to join HealthWeave</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-7">
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl mb-5">
            <button
              onClick={() => setIsNewUser(true)}
              className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${isNewUser ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}
            >
              New to HealthWeave
            </button>
            <button
              onClick={() => setIsNewUser(false)}
              className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${!isNewUser ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}
            >
              Existing User
            </button>
          </div>

          <div className="space-y-4">
            {isNewUser && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">First Name*</label>
                  <input className="hw-input" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Last Name*</label>
                  <input className="hw-input" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} required />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {isNewUser ? "Create Password*" : "Your Password*"}
              </label>
              <div className="relative">
                <input
                  className="hw-input pr-10"
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  required minLength={8}
                  placeholder={isNewUser ? "Min 8 characters" : "Your existing password"}
                />
                <button type="button" onClick={() => setShowPass((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || !form.password || (isNewUser && (!form.first_name || !form.last_name))}
              className="btn-primary w-full"
            >
              {mut.isPending ? "Joining…" : "Accept Invitation & Join"}
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-4 leading-relaxed">
            By accepting, you agree to HealthWeave's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
