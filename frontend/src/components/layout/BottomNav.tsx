import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Upload, MessageSquare, Bell, MoreHorizontal,
  Activity, Brain, FlaskConical, ShieldAlert, ShieldCheck, Send,
  LogOut, X, Home, FileText,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { intelligenceApi } from "../../services/api";
import { cn } from "../../utils/cn";

const PRIMARY_NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { to: "/upload",    icon: Upload,          label: "Upload" },
  { to: "/chat",      icon: MessageSquare,   label: "AI Chat", featured: true },
  { to: "/alerts",    icon: Bell,            label: "Alerts",  badge: true },
];

const MORE_NAV = [
  { to: "/records",    icon: FileText,     label: "My Records" },
  { to: "/timeline",   icon: Activity,     label: "Health Timeline" },
  { to: "/insights",   icon: Brain,        label: "Health Intelligence" },
  { to: "/biomarkers", icon: FlaskConical, label: "Biomarker Trends" },
  { to: "/risk",       icon: ShieldAlert,  label: "Risk Predictions" },
  { to: "/consent",    icon: ShieldCheck,  label: "My Consents" },
  { to: "/send-report",icon: Send,         label: "Send Report" },
  { to: "/passport",   icon: ShieldAlert,  label: "Emergency Passport" },
  { to: "/",           icon: Home,         label: "Back to Home" },
];

export function BottomNav() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const { data: alertsData } = useQuery({
    queryKey: ["alerts", false],
    queryFn: () => intelligenceApi.getAlerts(false),
    staleTime: 5 * 60 * 1000,
  });
  const alertCount  = (alertsData?.data || []).length;
  const criticalCnt = (alertsData?.data || []).filter((a: any) => a.risk_level === "critical").length;

  const handleLogout = () => {
    setSheetOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* More sheet overlay */}
      {sheetOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSheetOpen(false)}
        />
      )}

      {/* More sheet */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white rounded-t-3xl shadow-2xl transition-transform duration-300",
        sheetOpen ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <p className="text-sm font-bold text-slate-900">More</p>
          <button
            onClick={() => setSheetOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500"
          >
            <X size={16} />
          </button>
        </div>
        {/* Drag handle */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />

        <div className="grid grid-cols-4 gap-1 px-3 pb-2">
          {MORE_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSheetOpen(false)}
              className={({ isActive }) => cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-colors",
                isActive ? "bg-blue-50 text-brand-blue" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Icon size={20} />
              <span className="text-[10px] font-semibold text-center leading-tight">{label}</span>
            </NavLink>
          ))}
        </div>

        <div className="mx-3 mb-3 border-t border-slate-100 pt-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm font-semibold">Sign Out</span>
          </button>
        </div>
        {/* Safe area spacer */}
        <div style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} />
      </div>

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-slate-100 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {PRIMARY_NAV.map(({ to, icon: Icon, label, badge, featured }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                "flex flex-col items-center justify-center gap-1 transition-all",
                featured
                  ? "relative -mt-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-blue to-blue-700 shadow-blue-glow text-white"
                  : cn("w-14 h-14 rounded-xl", isActive ? "text-brand-blue" : "text-slate-400")
              )}
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon size={featured ? 22 : 20} />
                    {badge && alertCount > 0 && (
                      <span className={cn(
                        "absolute -top-1.5 -right-1.5 min-w-[16px] h-4 text-[9px] font-extrabold rounded-full flex items-center justify-center px-0.5 text-white",
                        criticalCnt > 0 ? "bg-red-500" : "bg-amber-500"
                      )}>
                        {alertCount > 9 ? "9+" : alertCount}
                      </span>
                    )}
                  </div>
                  {!featured && (
                    <span className={cn(
                      "text-[10px] font-semibold",
                      isActive ? "text-brand-blue" : "text-slate-400"
                    )}>
                      {label}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={() => setSheetOpen(true)}
            className="flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl text-slate-400"
          >
            <MoreHorizontal size={20} />
            <span className="text-[10px] font-semibold">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
