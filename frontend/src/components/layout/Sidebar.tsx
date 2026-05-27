import React from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Upload, Activity, MessageSquare,
  Bell, ShieldAlert, LogOut, Dna, User,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { intelligenceApi } from "../../services/api";
import { cn } from "../../utils/cn";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard",       end: true  },
  { to: "/upload",   icon: Upload,          label: "Upload Records",   end: false },
  { to: "/timeline", icon: Activity,        label: "Health Timeline",  end: false },
  { to: "/chat",     icon: MessageSquare,   label: "AI Assistant",     end: false },
  { to: "/alerts",   icon: Bell,            label: "Alerts",           end: false, badge: true },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const { data: alertsData } = useQuery({
    queryKey: ["alerts", false],
    queryFn: () => intelligenceApi.getAlerts(false),
    staleTime: 5 * 60 * 1000,
  });

  const alertCount  = (alertsData?.data || []).length;
  const criticalCnt = (alertsData?.data || []).filter((a: any) => a.risk_level === "critical").length;
  const first   = user?.profile?.first_name || "User";
  const last    = user?.profile?.last_name  || "";
  const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "U";

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <aside
      className="w-[260px] bg-sidebar-gradient flex flex-col h-screen fixed left-0 top-0 z-40 shadow-sidebar"
      style={{ background: "linear-gradient(180deg, #0F172A 0%, #0A0F1E 100%)" }}
    >
      {/* Logo — links back to home page */}
      <div className="px-5 py-5 border-b border-white/5">
        <Link to="/" className="flex items-center gap-3 group" title="Back to home">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center shadow-blue-glow shrink-0 group-hover:shadow-lg transition-all">
            <Dna size={17} className="text-white" />
          </div>
          <div>
            <p className="font-extrabold text-white text-sm tracking-tight leading-tight group-hover:text-brand-cyan transition-colors">HealthWeave</p>
            <p className="text-[10px] text-slate-500 font-medium leading-tight">AI Health Intelligence</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        <p className="section-label px-3 mb-3">Main Menu</p>

        {NAV.map(({ to, icon: Icon, label, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn("nav-item", isActive ? "nav-item-active" : "nav-item-inactive")
            }
          >
            <Icon size={17} className="shrink-0" />
            <span className="flex-1">{label}</span>
            {badge && alertCount > 0 && (
              <span className={cn(
                "text-[10px] font-extrabold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1",
                criticalCnt > 0 ? "bg-red-500 text-white animate-pulse-slow" : "bg-brand-amber text-white"
              )}>
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </NavLink>
        ))}

        <div className="pt-4 mt-3 border-t border-white/5">
          <p className="section-label px-3 mb-3">Emergency</p>
          <NavLink
            to="/passport"
            className={({ isActive }) =>
              cn("nav-item", isActive
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
              )
            }
          >
            <ShieldAlert size={17} className="shrink-0" />
            <span>Emergency Passport</span>
          </NavLink>
        </div>
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl mb-0.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
            {initials || <User size={14} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{first} {last}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="nav-item nav-item-inactive w-full text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
