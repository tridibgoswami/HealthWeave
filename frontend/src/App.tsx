import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";
import { AppShell } from "./components/layout/AppShell";
import { DoctorShell } from "./components/layout/DoctorShell";
import { AdminShell } from "./components/layout/AdminShell";
import { Dashboard } from "./pages/Dashboard";
import { LandingPage } from "./pages/LandingPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60_000, gcTime: 5 * 60_000 },
  },
});

const Login           = React.lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const ResetPassword    = React.lazy(() => import("./pages/ResetPassword").then((m) => ({ default: m.ResetPassword })));
const Register        = React.lazy(() => import("./pages/Register").then((m) => ({ default: m.Register })));
const RegisterChoice  = React.lazy(() => import("./pages/RegisterChoice").then((m) => ({ default: m.RegisterChoice })));
const RegisterDoctor  = React.lazy(() => import("./pages/RegisterDoctor").then((m) => ({ default: m.RegisterDoctor })));
const RegisterHospital = React.lazy(() => import("./pages/RegisterHospital").then((m) => ({ default: m.RegisterHospital })));
const JoinPage        = React.lazy(() => import("./pages/JoinPage").then((m) => ({ default: m.JoinPage })));
const TimelinePage    = React.lazy(() => import("./pages/TimelinePage").then((m) => ({ default: m.TimelinePage })));
const ChatPage        = React.lazy(() => import("./pages/ChatPage").then((m) => ({ default: m.ChatPage })));
const UploadPage      = React.lazy(() => import("./pages/UploadPage").then((m) => ({ default: m.UploadPage })));
const EmergencyPage   = React.lazy(() => import("./pages/EmergencyPage").then((m) => ({ default: m.EmergencyPage })));
const AlertsPage      = React.lazy(() => import("./pages/AlertsPage").then((m) => ({ default: m.AlertsPage })));
const PassportPage    = React.lazy(() => import("./pages/PassportPage").then((m) => ({ default: m.PassportPage })));
const ConsentPage     = React.lazy(() => import("./pages/ConsentPage").then((m) => ({ default: m.ConsentPage })));
const SendReportPage  = React.lazy(() => import("./pages/SendReportPage").then((m) => ({ default: m.SendReportPage })));
const InsightsPage    = React.lazy(() => import("./pages/InsightsPage").then((m) => ({ default: m.InsightsPage })));
const BiomarkerPage   = React.lazy(() => import("./pages/BiomarkerPage").then((m) => ({ default: m.BiomarkerPage })));
const RiskPage        = React.lazy(() => import("./pages/RiskPage").then((m) => ({ default: m.RiskPage })));
const VitalsPage      = React.lazy(() => import("./pages/VitalsPage").then((m) => ({ default: m.VitalsPage })));
const VisitsPage      = React.lazy(() => import("./pages/VisitsPage").then((m) => ({ default: m.VisitsPage })));
const MyRecordsPage   = React.lazy(() => import("./pages/MyRecordsPage").then((m) => ({ default: m.MyRecordsPage })));

// Doctor portal
const DoctorDashboard   = React.lazy(() => import("./pages/doctor/DoctorDashboard").then((m) => ({ default: m.DoctorDashboard })));
const DoctorPatients    = React.lazy(() => import("./pages/doctor/DoctorPatients").then((m) => ({ default: m.DoctorPatients })));
const DoctorPatientView = React.lazy(() => import("./pages/doctor/DoctorPatientView").then((m) => ({ default: m.DoctorPatientView })));

// Admin portal
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
const AdminDoctors   = React.lazy(() => import("./pages/admin/AdminDoctors").then((m) => ({ default: m.AdminDoctors })));
const AdminInvite    = React.lazy(() => import("./pages/admin/AdminInvite").then((m) => ({ default: m.AdminInvite })));

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400 font-medium">Loading…</p>
    </div>
  </div>
);

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <AppShell>{children}</AppShell> : <Navigate to="/login" replace />;
}

function DoctorProtected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === "hospital_admin") return <Navigate to="/admin/dashboard" replace />;
  return <DoctorShell>{children}</DoctorShell>;
}

function AdminProtected({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === "doctor") return <Navigate to="/doctor/dashboard" replace />;
  return <AdminShell>{children}</AdminShell>;
}

function RoleRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === "doctor") return <Navigate to="/doctor/dashboard" replace />;
  if (user?.role === "hospital_admin") return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AppInner() {
  const { isAuthenticated, fetchMe } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem("hw_access_token");
    if (token && !isAuthenticated) fetchMe();
  }, []);

  return (
    <BrowserRouter>
      <React.Suspense fallback={<Spinner />}>
        <Routes>
          {/* Public */}
          <Route path="/"                    element={<LandingPage />} />
          <Route path="/login"               element={<Login />} />
          <Route path="/reset-password"      element={<ResetPassword />} />
          <Route path="/register"            element={<RegisterChoice />} />
          <Route path="/register/patient"    element={<Register />} />
          <Route path="/register/doctor"     element={<RegisterDoctor />} />
          <Route path="/register/hospital"   element={<RegisterHospital />} />
          <Route path="/join"                element={<JoinPage />} />
          <Route path="/emergency/:token"    element={<EmergencyPage />} />

          {/* Patient portal — wrapped in AppShell */}
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/upload"    element={<Protected><UploadPage /></Protected>} />
          <Route path="/timeline"  element={<Protected><TimelinePage /></Protected>} />
          <Route path="/chat"      element={<Protected><ChatPage /></Protected>} />
          <Route path="/alerts"    element={<Protected><AlertsPage /></Protected>} />
          <Route path="/passport"  element={<Protected><PassportPage /></Protected>} />
          <Route path="/consent"      element={<Protected><ConsentPage /></Protected>} />
          <Route path="/send-report"  element={<Protected><SendReportPage /></Protected>} />
          <Route path="/insights"    element={<Protected><InsightsPage /></Protected>} />
          <Route path="/biomarkers"  element={<Protected><BiomarkerPage /></Protected>} />
          <Route path="/risk"        element={<Protected><RiskPage /></Protected>} />
          <Route path="/vitals"      element={<Protected><VitalsPage /></Protected>} />
          <Route path="/visits"      element={<Protected><VisitsPage /></Protected>} />
          <Route path="/records"     element={<Protected><MyRecordsPage /></Protected>} />

          {/* Doctor portal */}
          <Route path="/doctor/dashboard"              element={<DoctorProtected><DoctorDashboard /></DoctorProtected>} />
          <Route path="/doctor/patients"               element={<DoctorProtected><DoctorPatients /></DoctorProtected>} />
          <Route path="/doctor/patients/:patientId"    element={<DoctorProtected><DoctorPatientView /></DoctorProtected>} />

          {/* Hospital admin portal */}
          <Route path="/admin/dashboard" element={<AdminProtected><AdminDashboard /></AdminProtected>} />
          <Route path="/admin/doctors"   element={<AdminProtected><AdminDoctors /></AdminProtected>} />
          <Route path="/admin/invite"    element={<AdminProtected><AdminInvite /></AdminProtected>} />

          {/* Smart redirect based on role */}
          <Route path="/app" element={<RoleRedirect />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </React.Suspense>

      <Toaster
        position="top-right"
        toastOptions={{
          style: { borderRadius: "12px", fontSize: "13px", fontFamily: "Inter, sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,0.10)" },
          success: { iconTheme: { primary: "#10B981", secondary: "#fff" } },
          error:   { iconTheme: { primary: "#EF4444", secondary: "#fff" } },
        }}
      />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
