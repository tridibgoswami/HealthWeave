import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Dna, Lock, Mail, User, Phone, ArrowRight, CheckCircle2 } from "lucide-react";

const FEATURES = [
  "AI reads every lab report you upload",
  "8-organ health score updated with each test",
  "Lifetime health timeline built automatically",
  "AI alerts you before conditions worsen",
  "Private & encrypted — you own your data",
];

export function Register() {
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "", phone: "" });
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try { await register(form); navigate("/dashboard"); } catch {}
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen flex">
      {/* Left dark panel */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0A0F1E 0%, #0F172A 50%, #0D1B3E 100%)" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 right-10 w-64 h-64 rounded-full opacity-[0.06]"
            style={{ background: "radial-gradient(circle, #0066FF, transparent)" }} />
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center shadow-blue-glow">
            <Dna size={20} className="text-white" />
          </div>
          <div>
            <p className="font-extrabold text-white text-lg tracking-tight">HealthWeave</p>
            <p className="text-[10px] text-slate-500">AI Health Intelligence Platform</p>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white leading-tight tracking-tight mb-4">
            Your lifelong<br />health story,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-brand-blue to-brand-cyan">starts today.</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Join thousands who use HealthWeave to understand their health, spot trends,
            and visit their doctor armed with real insights.
          </p>
          <div className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-start gap-2.5">
                <CheckCircle2 size={15} className="text-brand-cyan shrink-0 mt-0.5" />
                <p className="text-sm text-slate-300">{f}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-slate-600 relative z-10">
          © 2026 HealthWeave · DPDP 2023 compliant · AES-256 encrypted
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-[420px] py-4">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl flex items-center justify-center">
              <Dna size={17} className="text-white" />
            </div>
            <span className="font-extrabold text-slate-900 text-lg">HealthWeave</span>
          </div>

          <div className="bg-white rounded-3xl shadow-card-hover border border-slate-100 p-8">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">Create your account</h2>
            <p className="text-slate-500 text-sm mb-7">Start your lifelong health journey — free forever</p>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                <Lock size={13} className="shrink-0 mt-0.5 text-red-400" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">First Name</label>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={form.first_name} onChange={set("first_name")} required
                      placeholder="Rahul" className="hw-input pl-9 py-2.5" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Last Name</label>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={form.last_name} onChange={set("last_name")} required
                      placeholder="Sharma" className="hw-input pl-9 py-2.5" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" value={form.email} onChange={set("email")} required
                    placeholder="you@example.com" className="hw-input pl-10" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Phone <span className="text-slate-400 font-normal normal-case">(optional)</span>
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="tel" value={form.phone} onChange={set("phone")}
                    placeholder="+91 98765 43210" className="hw-input pl-10" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="password" value={form.password} onChange={set("password")} required minLength={8}
                    placeholder="Min 8 characters" className="hw-input pl-10" />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full mt-1">
                {isLoading ? "Creating account…" : <><span>Create Account</span><ArrowRight size={15} /></>}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-brand-blue font-bold hover:text-blue-700">Sign in</Link>
            </p>
            <p className="text-xs text-center text-slate-400 mt-3 leading-relaxed">
              HealthWeave AI is for informational purposes only and does not replace medical advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
