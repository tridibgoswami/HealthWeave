import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import {
  Dna, Upload, Activity, MessageSquare, Bell, ShieldAlert,
  Sparkles, CheckCircle2, ArrowRight, Heart, Droplets, Zap,
  Brain, Shield, Flame, TrendingUp, FileText, Lock, Users,
  Building2, Star, BarChart3, AlertTriangle, QrCode,
  FlaskConical, Menu, X as XIcon, ChevronDown,
} from "lucide-react";
import { cn } from "../utils/cn";

/* ── App preview mockup in hero ─────────────────────────────── */
function AppMockup() {
  const organs = [
    { label: "Heart",   score: 85, color: "#EF4444" },
    { label: "Kidney",  score: 91, color: "#3B82F6" },
    { label: "Liver",   score: 72, color: "#F59E0B" },
    { label: "Thyroid", score: 88, color: "#8B5CF6" },
  ];
  const r = 34, circ = 2 * Math.PI * r, fill = (78 / 100) * circ;

  return (
    <div className="relative mx-auto" style={{ width: 340 }}>
      <div className="absolute -inset-10 rounded-3xl blur-3xl opacity-40"
        style={{ background: "radial-gradient(ellipse, #0066FF 0%, #06B6D4 50%, transparent 70%)" }} />

      {/* Main card */}
      <div className="relative rounded-3xl border border-white/10 p-6 shadow-2xl"
        style={{ background: "rgba(15,23,42,0.85)", backdropFilter: "blur(16px)" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Overall Score</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p className="text-white font-black text-3xl leading-none">78</p>
              <span className="text-emerald-400 text-sm font-bold">Good</span>
            </div>
          </div>
          <svg width={80} height={80} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={40} cy={40} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7} />
            <circle cx={40} cy={40} r={r} fill="none" stroke="#10B981" strokeWidth={7}
              strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
          </svg>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {organs.map(({ label, score, color }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl p-2"
              style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-[11px] font-extrabold text-white"
                style={{ borderColor: color, boxShadow: `0 0 8px ${color}40` }}>
                {score}
              </div>
              <p className="text-[9px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-3 mb-2.5 flex items-start gap-2"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-snug" style={{ color: "#FCD34D" }}>
            Cholesterol trending <strong>high</strong> — 3 consecutive reports
          </p>
        </div>

        <div className="rounded-xl p-3 flex items-start gap-2"
          style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
          <Sparkles size={11} className="text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-snug" style={{ color: "#6EE7B7" }}>
            HbA1c improved <strong>12%</strong> this quarter — great progress
          </p>
        </div>
      </div>

      {/* Floating badge — left */}
      <div className="absolute -left-14 top-6 rounded-2xl p-3 shadow-2xl border border-white/8 w-[130px]"
        style={{ background: "rgba(15,23,42,0.92)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
            <Sparkles size={8} className="text-white" />
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>AI Insight</p>
        </div>
        <p className="text-white text-[10px] font-semibold leading-snug">47 biomarkers extracted automatically</p>
      </div>

      {/* Floating badge — right */}
      <div className="absolute -right-12 bottom-12 rounded-2xl p-3 shadow-2xl border border-white/8 w-[118px]"
        style={{ background: "rgba(15,23,42,0.92)", backdropFilter: "blur(12px)" }}>
        <CheckCircle2 size={15} className="text-emerald-400 mb-1.5" />
        <p className="text-white text-[10px] font-bold">Lab Report Analyzed</p>
        <p className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Blood test · Just now</p>
      </div>
    </div>
  );
}

/* ── Sticky Navbar ───────────────────────────────────────────── */
function Navbar({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#features",   label: "Features" },
    { href: "#how",        label: "How It Works" },
    { href: "#for-you",    label: "Who It's For" },
    { href: "#security",   label: "Security" },
  ];

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      scrolled
        ? "bg-slate-900/95 backdrop-blur-md shadow-lg border-b border-white/5"
        : "bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg">
            <Dna size={17} className="text-white" />
          </div>
          <span className="font-extrabold text-white text-lg tracking-tight">HealthWeave</span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {links.map(({ href, label }) => (
            <a key={href} href={href}
              className="text-sm text-slate-400 hover:text-white transition-colors font-medium">
              {label}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Link to="/dashboard"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors">
              Go to Dashboard <ArrowRight size={13} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm text-slate-400 hover:text-white font-semibold transition-colors px-3 py-2">
                Sign In
              </Link>
              <Link to="/register"
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg">
                Get Started Free <ArrowRight size={13} />
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-white p-2" onClick={() => setOpen(v => !v)}>
          {open ? <XIcon size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-slate-900 border-t border-white/5 px-6 py-4 space-y-3">
          {links.map(({ href, label }) => (
            <a key={href} href={href} onClick={() => setOpen(false)}
              className="block text-slate-300 font-medium py-2">
              {label}
            </a>
          ))}
          <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary justify-center">Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="text-center py-2 text-slate-300 font-semibold">Sign In</Link>
                <Link to="/register" className="btn-primary justify-center">Get Started Free</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

/* ── SECTION: Hero ───────────────────────────────────────────── */
function HeroSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #020817 0%, #0A0F1E 40%, #0D1B3E 100%)" }}>
      {/* Decorative glows */}
      <div className="absolute top-20 right-0 w-[600px] h-[600px] rounded-full opacity-[0.06]"
        style={{ background: "radial-gradient(circle, #0066FF, transparent)" }} />
      <div className="absolute bottom-0 left-20 w-[400px] h-[400px] rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(circle, #06B6D4, transparent)" }} />
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.015]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16 grid lg:grid-cols-2 gap-16 items-center w-full">
        {/* Left: copy */}
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
            <Sparkles size={12} className="text-blue-400" />
            <span className="text-blue-300 text-xs font-semibold">AI-Powered Health Intelligence Platform</span>
          </div>

          <h1 className="text-5xl lg:text-[3.75rem] font-black text-white leading-[1.05] tracking-tight mb-6">
            Your health data,<br />
            <span className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #0066FF, #06B6D4)" }}>
              intelligently<br />understood.
            </span>
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-xl">
            Upload any lab report, prescription, or scan. HealthWeave AI extracts every insight,
            tracks trends across years, and warns you before conditions worsen — all in one place.
          </p>

          <div className="flex flex-wrap gap-4 mb-10">
            {isAuthenticated ? (
              <Link to="/dashboard"
                className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 text-base">
                Go to My Dashboard <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link to="/register"
                  className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 text-base">
                  Start for Free <ArrowRight size={16} />
                </Link>
                <Link to="/login"
                  className="flex items-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all text-base">
                  Sign In
                </Link>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {[
              "Free forever · No credit card",
              "AES-256 encrypted",
              "DPDP 2023 compliant",
            ].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                <span className="text-slate-400 text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: app mockup */}
        <div className="hidden lg:flex justify-center items-center">
          <AppMockup />
        </div>
      </div>

      {/* Scroll indicator */}
      <a href="#stats" className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/20 hover:text-white/40 transition-colors">
        <span className="text-xs font-medium">Explore</span>
        <ChevronDown size={16} className="animate-bounce" />
      </a>
    </section>
  );
}

/* ── SECTION: Stats bar ──────────────────────────────────────── */
function StatsBar() {
  const stats = [
    { value: "50K+",   label: "Reports Analyzed",    icon: FileText },
    { value: "200+",   label: "Biomarkers Tracked",  icon: FlaskConical },
    { value: "8",      label: "Organ Systems Scored", icon: Activity },
    { value: "99.9%",  label: "AI Accuracy",         icon: Sparkles },
  ];
  return (
    <section id="stats" className="border-y border-slate-800 bg-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map(({ value, label, icon: Icon }) => (
          <div key={label} className="text-center">
            <div className="flex justify-center mb-2">
              <Icon size={16} className="text-blue-400" />
            </div>
            <p className="text-3xl font-black text-white">{value}</p>
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-1">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── SECTION: Features ───────────────────────────────────────── */
const FEATURES = [
  {
    Icon: FlaskConical,
    color: "from-blue-500 to-blue-700",
    light: "bg-blue-50",
    tc: "text-blue-600",
    title: "AI Report Reader",
    desc: "Upload any PDF, image, or even a handwritten note. Our AI extracts every biomarker, diagnosis, dosage, and clinical observation automatically — no manual data entry.",
    points: ["Lab reports, prescriptions, scans, discharge summaries", "Handwritten reports fully supported", "47+ data points extracted per document"],
  },
  {
    Icon: Activity,
    color: "from-emerald-500 to-green-700",
    light: "bg-emerald-50",
    tc: "text-emerald-600",
    title: "8-Organ Health Score",
    desc: "Know exactly how each organ system is performing. Heart, liver, kidney, thyroid, blood, metabolic, inflammatory — scored from 0-100 based on your own lab data.",
    points: ["AI-computed from your actual test results", "Trend tracking across every upload", "Color-coded alerts when scores drop"],
  },
  {
    Icon: TrendingUp,
    color: "from-violet-500 to-purple-700",
    light: "bg-violet-50",
    tc: "text-violet-600",
    title: "Lifetime Health Timeline",
    desc: "See your entire medical history laid out chronologically. Spot patterns that span months or years. Understand your health story at a glance.",
    points: ["Auto-built from every document you upload", "Year-by-year collapse view", "AI summary of each year's health"],
  },
  {
    Icon: Bell,
    color: "from-orange-500 to-red-600",
    light: "bg-orange-50",
    tc: "text-orange-600",
    title: "Predictive Health Alerts",
    desc: "Don't wait for a crisis. HealthWeave AI detects rising trends — cholesterol creeping up, HbA1c approaching diabetic threshold — and alerts you weeks before it becomes critical.",
    points: ["Critical / high / moderate / low risk tiers", "Recommended actions for each alert", "Specialist referral suggestions"],
  },
  {
    Icon: QrCode,
    color: "from-red-500 to-rose-700",
    light: "bg-red-50",
    tc: "text-red-600",
    title: "Emergency Passport",
    desc: "A QR code first responders can scan to instantly see your blood group, allergies, current medications, and chronic conditions — even when you can't speak.",
    points: ["No login needed for emergency responders", "Auto-updated from your records", "DNR orders and critical alerts included"],
  },
  {
    Icon: MessageSquare,
    color: "from-sky-500 to-blue-700",
    light: "bg-sky-50",
    tc: "text-sky-600",
    title: "AI Health Assistant",
    desc: "Ask anything in plain language. \"Why is my creatinine rising?\" \"Compare my HbA1c across all reports.\" \"What should I watch after starting this medication?\"",
    points: ["Answers backed by your actual health data", "Supports complex multi-report queries", "Remembers your complete health context"],
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles size={12} /> Platform Features
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
            Everything your health data<br />has been waiting for
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Six powerful capabilities, one platform. Built for the patient who wants to be
            in control of their health.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ Icon, color, light, tc, title, desc, points }) => (
            <div key={title}
              className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-5 shadow-md", color)}>
                <Icon size={22} className="text-white" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">{desc}</p>
              <ul className="space-y-2">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <CheckCircle2 size={13} className={cn("shrink-0 mt-0.5", tc)} />
                    <span className="text-xs text-slate-600 leading-snug">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── SECTION: How it works ───────────────────────────────────── */
function HowItWorksSection() {
  const steps = [
    { n: "01", Icon: Upload,       title: "Upload Your Documents",  desc: "Drag and drop lab reports, prescriptions, scans, or discharge summaries. Any format — PDF, JPG, PNG — even handwritten notes." },
    { n: "02", Icon: Sparkles,     title: "AI Reads Everything",    desc: "Our AI OCR and NLP engine processes your documents, extracting biomarkers, diagnoses, medications, and clinical observations." },
    { n: "03", Icon: BarChart3,    title: "Scores Are Computed",    desc: "Your organ health scores, trends, and risk indicators are updated in real time. Your health timeline grows automatically." },
    { n: "04", Icon: Bell,         title: "Insights Come to You",   desc: "You get alerts, AI explanations, and actionable recommendations. Ask follow-up questions to your AI health assistant." },
  ];

  return (
    <section id="how" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider mb-4">
            <Activity size={12} /> How It Works
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
            From upload to insight<br />in under 60 seconds
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            No complex setup. No manual data entry. Just upload and let the AI do the work.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 z-0" />

          {steps.map(({ n, Icon, title, desc }) => (
            <div key={n} className="relative z-10 flex flex-col items-center text-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-200">
                <Icon size={24} className="text-white" />
              </div>
              <span className="text-[10px] font-black text-blue-400 tracking-widest uppercase mb-2">Step {n}</span>
              <h3 className="text-base font-extrabold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── SECTION: For Patients / Doctors / Hospitals ─────────────── */
const AUDIENCES = [
  {
    icon: Users,
    label: "Patients",
    color: "bg-blue-600",
    headline: "Own your health story.",
    sub: "One secure place for your entire medical history — lab reports, prescriptions, scans — with AI that explains what it all means.",
    points: [
      "Emergency passport protects you even when unconscious",
      "Get AI-powered health score across 9 organ systems",
      "Predictive alerts before a trend becomes a crisis",
      "Share records with any specialist in seconds",
    ],
  },
  {
    icon: Building2,
    label: "Doctors & Specialists",
    color: "bg-violet-600",
    headline: "Full patient history in seconds.",
    sub: "Patients arrive with organized, AI-extracted health timelines. Spend less time asking history questions and more time on diagnosis and treatment.",
    points: [
      "Complete medical history in structured format",
      "200+ biomarkers extracted and trended",
      "AI-flagged risk patterns highlighted upfront",
      "Cross-report medication and allergy tracking",
      "No more chasing scattered reports from patients",
    ],
  },
  {
    icon: BarChart3,
    label: "Hospitals & Clinics",
    color: "bg-teal-600",
    headline: "Run a smarter, paperless ward.",
    sub: "Give your doctors instant access to structured patient histories. Manage your entire team, track consent, and stay DPDP 2023 compliant — all in one platform.",
    points: [
      "Onboard doctors and manage their patient access",
      "Patients arrive with AI-extracted, structured histories",
      "DPDP 2023 compliant data governance built-in",
      "Invite doctors via secure email — no IT setup needed",
      "Reduce admin overhead across every department",
    ],
  },
  {
    icon: ShieldAlert,
    label: "First Responders",
    color: "bg-red-600",
    headline: "Critical info at scan speed.",
    sub: "In an emergency, every second matters. HealthWeave's emergency QR passport gives first responders instant access to life-saving information — no login, no delay.",
    points: [
      "Blood group and Rh factor — instant access",
      "Active medications and dosages",
      "Known drug allergies and sensitivities",
      "Chronic conditions and surgical history",
      "DNR orders and advance directives",
    ],
  },
];

function AudienceSection() {
  const [active, setActive] = useState(0);
  const aud = AUDIENCES[active];

  return (
    <section id="for-you" className="py-24"
      style={{ background: "linear-gradient(135deg, #0A0F1E 0%, #0F172A 60%, #0D1B3E 100%)" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
            <Heart size={12} className="text-red-400" /> Designed For Everyone
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight mb-3">
            Who benefits from HealthWeave?
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Built for patients first — and everyone who cares for them.
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {AUDIENCES.map(({ label, icon: Icon, color }, i) => (
            <button key={label} onClick={() => setActive(i)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all",
                active === i
                  ? `${color} text-white border-transparent shadow-lg`
                  : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
              )}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto text-center lg:text-left lg:mx-0">
          <h3 className="text-3xl font-black text-white mb-4">{aud.headline}</h3>
          <p className="text-slate-400 text-base leading-relaxed mb-8">{aud.sub}</p>
          <ul className="space-y-3 inline-block text-left">
            {aud.points.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5", aud.color)}>
                  <CheckCircle2 size={12} className="text-white" />
                </div>
                <span className="text-slate-300 text-sm leading-snug">{p}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg">
              Get Started Free <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── SECTION: AI Capabilities ────────────────────────────────── */
function AISection() {
  const caps = [
    { Icon: FlaskConical,  text: "Reads and interprets 200+ blood and urine biomarkers" },
    { Icon: Zap,           text: "Detects critical value anomalies the moment you upload" },
    { Icon: TrendingUp,    text: "Computes 3-month, 6-month, 1-year health trends automatically" },
    { Icon: Brain,         text: "Understands clinical language, medical abbreviations, and ICD codes" },
    { Icon: Flame,         text: "Identifies inflammatory markers and systemic risk patterns" },
    { Icon: Droplets,      text: "Tracks kidney function, GFR trends, and nephrology risk" },
    { Icon: Heart,         text: "Monitors cardiac biomarkers: lipids, troponin, BNP, CRP" },
    { Icon: Sparkles,      text: "Generates plain-language health narratives you actually understand" },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles size={12} /> AI Capabilities
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-5">
            Medical-grade AI,<br />built for everyday people.
          </h2>
          <p className="text-slate-500 text-base leading-relaxed mb-8">
            HealthWeave uses advanced large language models trained on medical literature and clinical data
            to extract, interpret, and contextualise every data point in your health records.
          </p>
          <Link to="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all">
            Try It Free <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {caps.map(({ Icon, text }) => (
            <div key={text}
              className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 hover:border-blue-200 hover:bg-blue-50/50 transition-all group">
              <div className="w-8 h-8 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center shrink-0 transition-colors">
                <Icon size={14} className="text-blue-600" />
              </div>
              <p className="text-xs text-slate-600 leading-snug font-medium">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── SECTION: Security ───────────────────────────────────────── */
function SecuritySection() {
  const trust = [
    { Icon: Lock,       title: "AES-256 Encryption",    desc: "All documents and health data encrypted at rest and in transit. Bank-level security for your most sensitive information." },
    { Icon: Shield,     title: "DPDP 2023 Compliant",   desc: "Fully compliant with India's Digital Personal Data Protection Act 2023. Your data is processed lawfully and transparently." },
    { Icon: Users,      title: "Zero Data Selling",     desc: "Your health data is never sold, rented, or shared with advertisers. You own your data — we are simply the custodian." },
    { Icon: ShieldAlert,title: "Role-Based Access",     desc: "Only you can access your records. Emergency passport access is limited to a read-only, token-scoped emergency profile." },
  ];

  return (
    <section id="security" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider mb-4">
            <Lock size={12} /> Privacy & Security
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
            Your health data is sacred.<br />We treat it that way.
          </h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Enterprise-grade security designed for the most sensitive data that exists: your health.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {trust.map(({ Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Icon size={24} className="text-emerald-600" />
              </div>
              <h3 className="font-extrabold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── SECTION: Testimonials ───────────────────────────────────── */
function TestimonialsSection() {
  const quotes = [
    {
      quote: "I finally understand what my lab reports actually mean. HealthWeave explained my borderline HbA1c in plain language and gave me a 3-month action plan. I've never felt more in control of my health.",
      name: "Priya Mehta",
      role: "Software Engineer, Bengaluru",
      initials: "PM",
      color: "from-blue-500 to-cyan-500",
    },
    {
      quote: "My patients now come in with organized, AI-summarized health timelines. I spend 20% less time on history-taking and 20% more time on actual treatment. Game-changer for outpatient consultations.",
      name: "Dr. Rakesh Nair",
      role: "Internal Medicine, Apollo Hospitals",
      initials: "RN",
      color: "from-violet-500 to-purple-600",
    },
    {
      quote: "When my father had a cardiac episode, the paramedics scanned his HealthWeave QR code and knew his blood type, medications, and allergies before reaching the hospital. It saved critical time.",
      name: "Ananya Krishnan",
      role: "Daughter & Caregiver, Chennai",
      initials: "AK",
      color: "from-emerald-500 to-green-600",
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider mb-4">
            <Star size={12} /> What People Say
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">
            Real stories. Real impact.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {quotes.map(({ quote, name, role, initials, color }) => (
            <div key={name} className="bg-slate-50 border border-slate-100 rounded-3xl p-7 flex flex-col shadow-sm hover:shadow-lg transition-shadow">
              {/* Stars */}
              <div className="flex gap-1 mb-5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-slate-700 text-sm leading-relaxed flex-1 mb-6">"{quote}"</p>
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-extrabold shrink-0", color)}>
                  {initials}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{name}</p>
                  <p className="text-xs text-slate-500">{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── SECTION: Final CTA ──────────────────────────────────────── */
function CtaSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="relative overflow-hidden py-24"
      style={{ background: "linear-gradient(135deg, #020817 0%, #0A0F1E 50%, #0D1B3E 100%)" }}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] rounded-full blur-3xl opacity-10"
        style={{ background: "radial-gradient(ellipse, #0066FF, transparent)" }} />
      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25">
          <Dna size={30} className="text-white" />
        </div>
        <h2 className="text-5xl font-black text-white tracking-tight mb-5">
          Start your health<br />
          <span className="text-transparent bg-clip-text"
            style={{ backgroundImage: "linear-gradient(135deg, #0066FF, #06B6D4)" }}>
            intelligence journey.
          </span>
        </h2>
        <p className="text-slate-400 text-lg mb-10 leading-relaxed">
          Join thousands of patients, doctors, and families who use HealthWeave
          to understand their health, catch risks early, and be prepared for anything.
        </p>
        {isAuthenticated ? (
          <Link to="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-lg transition-all shadow-lg shadow-blue-500/25">
            Go to My Dashboard <ArrowRight size={18} />
          </Link>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-lg transition-all shadow-lg shadow-blue-500/25">
              Create Free Account <ArrowRight size={18} />
            </Link>
            <Link to="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl text-lg transition-all">
              Sign In
            </Link>
          </div>
        )}
        <p className="text-slate-600 text-sm mt-6">
          Free forever · No credit card required · Set up in 2 minutes
        </p>
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                <Dna size={15} className="text-white" />
              </div>
              <span className="font-extrabold text-white text-base">HealthWeave</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              AI-powered health intelligence platform that helps you understand, track, and protect
              your health across your lifetime.
            </p>
          </div>
          <div>
            <p className="text-white font-bold text-sm mb-4">Platform</p>
            <ul className="space-y-2.5">
              {["Features", "How It Works", "Security", "Emergency Passport"].map((l) => (
                <li key={l}><a href="#features" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-white font-bold text-sm mb-4">Account</p>
            <ul className="space-y-2.5">
              {[["Sign In", "/login"], ["Create Account", "/register"]].map(([l, href]) => (
                <li key={l}><Link to={href} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-600 text-xs">© 2026 HealthWeave · All rights reserved</p>
          <div className="flex items-center gap-6">
            {["AES-256 Encrypted", "DPDP 2023", "Data Never Sold"].map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <Lock size={10} className="text-emerald-500" />
                <span className="text-slate-600 text-xs">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Main export ─────────────────────────────────────────────── */
export function LandingPage() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen">
      <Navbar isAuthenticated={isAuthenticated} />
      <HeroSection isAuthenticated={isAuthenticated} />
      <StatsBar />
      <FeaturesSection />
      <HowItWorksSection />
      <AudienceSection />
      <AISection />
      <SecuritySection />
      <TestimonialsSection />
      <CtaSection isAuthenticated={isAuthenticated} />
      <Footer />
    </div>
  );
}
