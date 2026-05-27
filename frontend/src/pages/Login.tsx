import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Dna, Lock, Mail, ArrowRight, ShieldCheck, Sparkles, Activity } from "lucide-react";

const TRUST_POINTS = [
  { Icon: ShieldCheck, text: "AES-256 encrypted, DPDP 2023 compliant" },
  { Icon: Sparkles,    text: "AI analyses 200+ biomarkers from your reports" },
  { Icon: Activity,    text: "Tracks organ health across your lifetime" },
];

export function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try { await login(email, password); navigate("/dashboard"); } catch {}
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left: dark brand panel ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0A0F1E 0%, #0F172A 50%, #0D1B3E 100%)" }}>
        {/* Decorative glows */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-[0.07]"
            style={{ background: "radial-gradient(circle, #0066FF, transparent)" }} />
          <div className="absolute bottom-20 right-0 w-56 h-56 rounded-full opacity-[0.05]"
            style={{ background: "radial-gradient(circle, #06B6D4, transparent)" }} />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center shadow-blue-glow">
            <Dna size={20} className="text-white" />
          </div>
          <div>
            <p className="font-extrabold text-white text-lg tracking-tight">HealthWeave</p>
            <p className="text-[10px] text-slate-500">AI Health Intelligence Platform</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight mb-5">
            Your health,<br />
            <span className="text-transparent bg-clip-text" style={{
              background: "linear-gradient(135deg, #0066FF, #06B6D4)"
            }}>intelligently<br />understood.</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-10 max-w-sm">
            Upload your lab reports, prescriptions and scans. Our AI extracts insights,
            tracks trends across years, and helps you understand your health like never before.
          </p>

          <div className="space-y-4">
            {TRUST_POINTS.map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-brand-cyan" />
                </div>
                <p className="text-sm text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6 relative z-10">
          {[
            { v: "50K+",  l: "Reports analysed" },
            { v: "200+",  l: "Biomarkers" },
            { v: "99.9%", l: "Accuracy" },
          ].map(({ v, l }) => (
            <div key={l}>
              <p className="text-2xl font-black text-white">{v}</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl flex items-center justify-center">
              <Dna size={17} className="text-white" />
            </div>
            <span className="font-extrabold text-slate-900 text-lg">HealthWeave</span>
          </div>

          <div className="bg-white rounded-3xl shadow-card-hover border border-slate-100 p-8">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">Welcome back</h2>
            <p className="text-slate-500 text-sm mb-7">Sign in to your health dashboard</p>

            {error && (
              <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                <Lock size={13} className="shrink-0 mt-0.5 text-red-400" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" required className="hw-input pl-10" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" required className="hw-input pl-10" />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
                {isLoading ? "Signing in…" : <><span>Sign In</span><ArrowRight size={15} /></>}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Don't have an account?{" "}
              <Link to="/register" className="text-brand-blue font-bold hover:text-blue-700">
                Create one free
              </Link>
            </p>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-5 flex items-center justify-center gap-1.5">
            <Lock size={10} /> AES-256 encrypted · DPDP 2023 · Your data is never sold
          </p>
        </div>
      </div>
    </div>
  );
}
