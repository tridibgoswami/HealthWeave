/**
 * HealthWeave – Root Application Component
 */

import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/authStore";
import { Dashboard } from "./pages/Dashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// Lazy-loaded pages
const Login = React.lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const Register = React.lazy(() => import("./pages/Register").then((m) => ({ default: m.Register })));
const TimelinePage = React.lazy(() => import("./pages/TimelinePage").then((m) => ({ default: m.TimelinePage })));
const ChatPage = React.lazy(() => import("./pages/ChatPage").then((m) => ({ default: m.ChatPage })));
const UploadPage = React.lazy(() => import("./pages/UploadPage").then((m) => ({ default: m.UploadPage })));
const EmergencyPage = React.lazy(() => import("./pages/EmergencyPage").then((m) => ({ default: m.EmergencyPage })));
const AlertsPage = React.lazy(() => import("./pages/AlertsPage").then((m) => ({ default: m.AlertsPage })));

function AppInner() {
  const { isAuthenticated, fetchMe } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem("hw_access_token");
    if (token && !isAuthenticated) {
      fetchMe();
    }
  }, []);

  return (
    <BrowserRouter>
      <React.Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/emergency/:token" element={<EmergencyPage />} />

          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/timeline" element={<ProtectedRoute><TimelinePage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
          <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>

      <Toaster
        position="top-center"
        toastOptions={{
          style: { borderRadius: "12px", fontSize: "14px" },
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
