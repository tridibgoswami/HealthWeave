import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Heart, Lock, Mail, ArrowRight } from "lucide-react";

export function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      navigate("/");
    } catch {}
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel – branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex-col justify-between p-12">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Heart size={18} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">HealthWeave</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Your AI-powered<br />health intelligence<br />companion
          </h1>
          <p className="text-blue-200 text-base leading-relaxed">
            Upload lab reports, prescriptions and scans. Our AI extracts insights,
            tracks trends, and helps you understand your health — across your lifetime.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { label: "Reports analysed",  value: "50K+" },
              { label: "Biomarkers tracked", value: "200+" },
              { label: "Insights generated", value: "99%" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-blue-300 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-blue-400">
          © 2026 HealthWeave · DPDP 2023 compliant · AES-256 encrypted
        </p>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Heart size={18} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">HealthWeave</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-8">Sign in to your health dashboard</p>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              <Lock size={14} className="shrink-0 mt-0.5 text-red-400" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm mt-2"
            >
              {isLoading ? "Signing in…" : (
                <><span>Sign In</span><ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-600 font-semibold hover:text-blue-700">
              Create one free
            </Link>
          </p>

          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
            <Lock size={11} />
            <span>AES-256 encrypted · DPDP 2023 compliant · Data never sold</span>
          </div>
        </div>
      </div>
    </div>
  );
}
