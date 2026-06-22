import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Dna, Lock, ArrowRight, CheckCircle } from "lucide-react";
import { authApi } from "../services/api";

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ token, new_password: newPassword });
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl flex items-center justify-center">
            <Dna size={17} className="text-white" />
          </div>
          <span className="font-extrabold text-slate-900 text-lg">HealthWeave</span>
        </div>

        <div className="bg-white rounded-3xl shadow-card-hover border border-slate-100 p-8">
          {!token ? (
            <div className="text-center">
              <h2 className="text-xl font-extrabold text-slate-900 mb-2">Invalid reset link</h2>
              <p className="text-sm text-slate-500 mb-6">
                This password reset link is missing its token. Please request a new one.
              </p>
              <Link to="/login" className="text-brand-blue font-bold text-sm hover:text-blue-700">
                ← Back to Sign In
              </Link>
            </div>
          ) : done ? (
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={26} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-2">Password updated</h2>
              <p className="text-sm text-slate-500">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1">Set a new password</h2>
              <p className="text-slate-500 text-sm mb-7">Choose a new password for your account.</p>

              {error && (
                <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                  <Lock size={13} className="shrink-0 mt-0.5 text-red-400" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                    New password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••" required minLength={8} className="hw-input pl-10" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••" required minLength={8} className="hw-input pl-10" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                  {loading ? "Updating…" : <><span>Reset Password</span><ArrowRight size={15} /></>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
