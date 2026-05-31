import React from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Dna, LogOut, Stethoscope,
  Bell, User, Home,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "../../services/api";
import { cn } from "../../utils/cn";

const NAV = [
  { to: "/doctor/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/doctor/patients",  icon: Users,           label: "My Patients" },
  { to: "/doctor/profile",   icon: User,            label: "My Profile" },
];

export function DoctorShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const first = user?.profile?.first_name || "Doctor";
  const last  = user?.profile?.last_name  || "";
  const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "D";

  const { data: notifData } = useQuery({
    queryKey: ["notif-count"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30_000,
  });
  const unread = notifData?.data?.count || 0;

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className="w-[240px] flex flex-col h-screen fixed left-0 top-0 z-40"
        style={{ background: "linear-gradient(180deg, #064E3B 0%, #022C22 100%)" }}
      >
        <div className="px-5 py-5 border-b border-white/5">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shrink-0">
              <Dna size={17} className="text-white" />
            </div>
            <div>
              <p className="font-extrabold text-white text-sm tracking-tight leading-tight">HealthWeave</p>
              <p className="text-[10px] text-emerald-400/70 font-medium leading-tight">Doctor Portal</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-3">Navigation</p>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn("nav-item", isActive
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-white/60 hover:text-white hover:bg-white/5")
              }
            >
              <Icon size={17} className="shrink-0" />
              <span className="flex-1">{label}</span>
            </NavLink>
          ))}

          <div className="pt-3 mt-2 border-t border-white/5">
            <Link to="/" className="nav-item text-white/40 hover:text-white/70 hover:bg-white/5">
              <Home size={17} className="shrink-0" />
              <span>Back to Home</span>
            </Link>
          </div>
        </nav>

        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">Dr. {first} {last}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="nav-item w-full text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:ml-[240px] flex-1 flex flex-col min-h-screen overflow-y-auto">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Stethoscope size={16} className="text-emerald-600" />
            <span className="text-sm font-semibold text-slate-700">Doctor Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/doctor/notifications" className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell size={18} className="text-slate-500" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-xs">
                {initials}
              </div>
              Dr. {first}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
