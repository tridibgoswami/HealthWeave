import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Stethoscope, Dna, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../store/authStore";

const SPECIALIZATIONS = [
  // Medical
  "General Physician",
  "General Medicine / Internal Medicine",
  "Allergy & Immunology",
  "Cardiology",
  "Clinical Pharmacology",
  "Critical Care / Intensivist",
  "Dermatology",
  "Diabetology",
  "Emergency Medicine",
  "Endocrinology",
  "Gastroenterology",
  "Geriatrics",
  "Hematology",
  "Hepatology",
  "Infectious Diseases",
  "Medical Genetics",
  "Medical Oncology",
  "Neonatology",
  "Nephrology",
  "Neurology",
  "Nuclear Medicine",
  "Obstetrics & Gynecology",
  "Ophthalmology",
  "Pediatrics",
  "Physical Medicine & Rehabilitation",
  "Psychiatry & Mental Health",
  "Pulmonology / Respiratory Medicine",
  "Radiation Oncology",
  "Radiology",
  "Rheumatology",
  "Sports Medicine",
  // Surgical
  "General Surgery",
  "Cardiothoracic Surgery",
  "Colorectal Surgery",
  "ENT (Ear, Nose & Throat) Surgery",
  "Laparoscopic Surgery",
  "Neurosurgery",
  "Oncological Surgery / Surgical Oncology",
  "Oral & Maxillofacial Surgery",
  "Orthopedic Surgery",
  "Pediatric Surgery",
  "Plastic & Reconstructive Surgery",
  "Urology",
  "Vascular Surgery",
  // Other
  "Anesthesiology",
  "Palliative Care / Pain Management",
  "Pathology",
  "Other",
];

export function RegisterDoctor() {
  const navigate = useNavigate();
  const { register, error, isLoading, clearError } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", password: "",
    specialization: "", medical_registration_number: "",
  });

  const set = (k: string, v: string) => { clearError(); setForm((p) => ({ ...p, [k]: v })); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({ ...form, role: "doctor" });
      navigate("/doctor/dashboard");
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
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                <Stethoscope size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">Doctor Registration</h1>
                <p className="text-xs text-slate-500">Professional medical account</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">First Name*</label>
                  <input className="hw-input" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} required placeholder="Rahul" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Last Name*</label>
                  <input className="hw-input" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} required placeholder="Sharma" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Work Email*</label>
                <input className="hw-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required placeholder="doctor@hospital.com" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone Number</label>
                <input className="hw-input" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Specialization*</label>
                <select className="hw-input" value={form.specialization} onChange={(e) => set("specialization", e.target.value)} required>
                  <option value="">Select specialization...</option>
                  {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Medical Registration Number*</label>
                <input className="hw-input" value={form.medical_registration_number} onChange={(e) => set("medical_registration_number", e.target.value)} required placeholder="MH/12345/2018" />
                <p className="text-[11px] text-slate-400 mt-1">MCI / State Medical Council registration</p>
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

              <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
                {isLoading ? "Creating account…" : "Create Doctor Account"}
              </button>
            </form>

            <p className="text-center text-xs text-slate-500 mt-5">
              Already have an account?{" "}
              <Link to="/login" className="text-brand-blue font-semibold hover:underline">Sign in</Link>
            </p>

            <p className="text-center text-[11px] text-slate-400 mt-3 leading-relaxed">
              By registering you agree to our Terms & Privacy Policy. Patient data access requires explicit patient consent per DPDP 2023.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
