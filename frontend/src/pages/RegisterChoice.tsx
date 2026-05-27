import React from "react";
import { Link } from "react-router-dom";
import { UserCircle, Stethoscope, Building2, ArrowRight, Dna, ShieldCheck } from "lucide-react";

const ROLES = [
  {
    icon: UserCircle,
    color: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50",
    border: "border-blue-200 hover:border-blue-400",
    title: "Patient",
    subtitle: "Manage your health records",
    description: "Upload lab reports, prescriptions & scans. Get AI-powered health insights, biomarker trends, and predictive health alerts.",
    href: "/register/patient",
    bullets: ["Lifelong health timeline", "AI health scores", "Emergency passport", "Share with doctors"],
  },
  {
    icon: Stethoscope,
    color: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200 hover:border-emerald-400",
    title: "Doctor",
    subtitle: "View consented patient records",
    description: "Access patient histories with consent, add clinical notes, request lab tests, and track patient health trends over time.",
    href: "/register/doctor",
    bullets: ["Patient consent management", "Clinical notes & records", "Lab request portal", "Biomarker trend analysis"],
  },
  {
    icon: Building2,
    color: "from-purple-500 to-violet-500",
    bg: "bg-purple-50",
    border: "border-purple-200 hover:border-purple-400",
    title: "Hospital / Clinic",
    subtitle: "Manage your entire organization",
    description: "Onboard doctors, manage patient flow, view org-level analytics, and ensure DPDP 2023 compliant data governance.",
    href: "/register/hospital",
    bullets: ["Doctor onboarding & invites", "Org-level dashboard", "DPDP 2023 compliant", "Multi-department support"],
  },
];

export function RegisterChoice() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Dna size={16} className="text-white" />
          </div>
          <span className="text-white font-extrabold text-sm tracking-tight">HealthWeave</span>
        </Link>
        <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
          Sign in instead
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-10 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 border border-white/10">
            <ShieldCheck size={12} /> DPDP 2023 Compliant
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">
            Who are you joining as?
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Choose your role to get a tailored experience. You can always connect with other roles later.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl">
          {ROLES.map(({ icon: Icon, color, bg, border, title, subtitle, description, href, bullets }) => (
            <Link
              key={title}
              to={href}
              className={`group relative bg-white rounded-2xl border-2 ${border} p-6 flex flex-col gap-4 transition-all duration-200 hover:shadow-2xl hover:-translate-y-1`}
            >
              <div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg`}>
                  <Icon size={22} className="text-white" />
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{title}</h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">{subtitle}</p>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">{description}</p>

              <ul className="space-y-1.5">
                {bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-xs text-slate-600">
                    <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3 5.5L6.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {b}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-2">
                <div className={`flex items-center justify-center gap-2 text-sm font-bold bg-gradient-to-r ${color} text-white rounded-xl py-2.5 group-hover:shadow-lg transition-all`}>
                  Get Started as {title}
                  <ArrowRight size={14} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
