import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Dna, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../store/authStore";

export function RegisterHospital() {
  const navigate = useNavigate();
  const { register, error, isLoading, clearError } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", password: "",
    organization_name: "",
  });

  const set = (k: string, v: string) => { clearError(); setForm((p) => ({ ...p, [k]: v })); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({ ...form, role: "hospital_admin" });
      navigate("/admin/dashboard");
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      <div className="flex items-center justify-between px-8 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Dna size={16} className="text-white" />
          </div>
          <span className="text-white font-extrabold text-sm">HealthWeave</span>
        </Link>
        <Link to="/register" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Back to role selection
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-lg">
                <Building2 size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">Hospital Registration</h1>
                <p className="text-xs text-slate-500">Admin account for your organization</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hospital / Clinic Name*</label>
                <input className="hw-input" value={form.organization_name} onChange={(e) => set("organization_name", e.target.value)} required placeholder="Apollo Hospitals, Mumbai" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Admin First Name*</label>
                  <input className="hw-input" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required placeholder="Priya" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Admin Last Name*</label>
                  <input className="hw-input" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} required placeholder="Mehta" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Official Email*</label>
                <input className="hw-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required placeholder="admin@hospital.com" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label>
                <input className="hw-input" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password*</label>
                <div className="relative">
                  <input
                    className="hw-input pr-10"
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    required minLength={8}
                    placeholder="Min 8 characters"
                  />
                  <button type="button" onClick={() => setShowPass((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-700 leading-relaxed">
                After registration, you'll be able to create your organization profile and invite doctors to join your team.
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700">
                {isLoading ? "Creating account…" : "Register Hospital Account"}
              </button>
            </form>

            <p className="text-center text-xs text-slate-500 mt-5">
              Already have an account?{" "}
              <Link to="/login" className="text-brand-blue font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
