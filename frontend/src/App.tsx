import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";
import { AppShell } from "./components/layout/AppShell";
import { Dashboard } from "./pages/Dashboard";
import { LandingPage } from "./pages/LandingPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60_000, gcTime: 5 * 60_000 },
  },
});

const Login         = React.lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const Register      = React.lazy(() => import("./pages/Register").then((m) => ({ default: m.Register })));
const TimelinePage  = React.lazy(() => import("./pages/TimelinePage").then((m) => ({ default: m.TimelinePage })));
const ChatPage      = React.lazy(() => import("./pages/ChatPage").then((m) => ({ default: m.ChatPage })));
const UploadPage    = React.lazy(() => import("./pages/UploadPage").then((m) => ({ default: m.UploadPage })));
const EmergencyPage = React.lazy(() => import("./pages/EmergencyPage").then((m) => ({ default: m.EmergencyPage })));
const AlertsPage    = React.lazy(() => import("./pages/AlertsPage").then((m) => ({ default: m.AlertsPage })));
const PassportPage  = React.lazy(() => import("./pages/PassportPage").then((m) => ({ default: m.PassportPage })));

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
          <Route path="/"                   element={<LandingPage />} />
          <Route path="/login"              element={<Login />} />
          <Route path="/register"           element={<Register />} />
          <Route path="/emergency/:token"   element={<EmergencyPage />} />

          {/* Protected — wrapped in AppShell */}
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/upload"   element={<Protected><UploadPage /></Protected>} />
          <Route path="/timeline" element={<Protected><TimelinePage /></Protected>} />
          <Route path="/chat"     element={<Protected><ChatPage /></Protected>} />
          <Route path="/alerts"   element={<Protected><AlertsPage /></Protected>} />
          <Route path="/passport" element={<Protected><PassportPage /></Protected>} />

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
