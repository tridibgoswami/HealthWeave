import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Heart, Lock, Mail, User, Phone, ArrowRight, CheckCircle2 } from "lucide-react";

export function Register() {
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "", phone: "" });
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await register(form);
      navigate("/");
    } catch {}
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const FEATURES = [
    "AI reads your lab reports and extracts biomarkers",
    "Tracks 8 organ health scores over your lifetime",
    "Alerts you to early health risks before they worsen",
    "Private & encrypted — you own your data",
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-indigo-700 via-blue-700 to-blue-600 flex-col justify-between p-12">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Heart size={18} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">HealthWeave</span>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white leading-tight mb-4">
            Your lifelong<br />health intelligence<br />starts here
          </h1>
          <p className="text-blue-200 text-sm leading-relaxed mb-8">
            Join thousands of people who use HealthWeave to understand their health,
            spot trends, and prepare for doctor visits with confidence.
          </p>
          <div className="space-y-3">
            {FEATURES.map((feat) => (
              <div key={feat} className="flex items-start gap-2.5">
                <CheckCircle2 size={15} className="text-blue-300 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-100">{feat}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-blue-400">
          © 2026 HealthWeave · DPDP 2023 compliant · AES-256 encrypted
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md py-4">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Heart size={18} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">HealthWeave</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h2>
          <p className="text-gray-500 text-sm mb-8">Start your lifelong health journey — free forever</p>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              <Lock size={14} className="shrink-0 mt-0.5 text-red-400" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">First Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={form.first_name} onChange={set("first_name")} required
                    placeholder="Rahul"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Last Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={form.last_name} onChange={set("last_name")} required
                    placeholder="Sharma"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" value={form.email} onChange={set("email")} required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="tel" value={form.phone} onChange={set("phone")}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="password" value={form.password} onChange={set("password")} required minLength={8}
                  placeholder="Min 8 characters"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all" />
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm">
              {isLoading ? "Creating account…" : (
                <><span>Create Account</span><ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700">Sign in</Link>
          </p>
          <p className="text-xs text-center text-gray-400 mt-4 leading-relaxed">
            By registering you acknowledge that HealthWeave AI is for informational purposes only
            and does not replace professional medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}
