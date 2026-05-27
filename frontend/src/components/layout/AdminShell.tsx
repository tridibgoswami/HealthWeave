import React from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Building2, Dna, LogOut, Bell, UserPlus } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "../../services/api";
import { cn } from "../../utils/cn";

const NAV = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/doctors",   icon: Users,           label: "Doctors" },
  { to: "/admin/invite",    icon: UserPlus,        label: "Invite Doctor" },
  { to: "/admin/org",       icon: Building2,       label: "Organization" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const first = user?.profile?.first_name || "Admin";
  const last  = user?.profile?.last_name  || "";
  const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "A";

  const { data: notifData } = useQuery({
    queryKey: ["notif-count"],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30_000,
  });
  const unread = notifData?.data?.count || 0;

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="flex h-screen bg-slate-50">
      <aside
        className="w-[240px] flex flex-col h-screen fixed left-0 top-0 z-40"
        style={{ background: "linear-gradient(180deg, #1E1B4B 0%, #0F0C2E 100%)" }}
      >
        <div className="px-5 py-5 border-b border-white/5">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shrink-0">
              <Dna size={17} className="text-white" />
            </div>
            <div>
              <p className="font-extrabold text-white text-sm tracking-tight leading-tight">HealthWeave</p>
              <p className="text-[10px] text-purple-400/70 font-medium leading-tight">Admin Portal</p>
            </div>
          </Link>
        </div>

        {user?.organization && (
          <div className="px-5 py-3 border-b border-white/5">
            <p className="text-[10px] text-white/40 font-medium uppercase tracking-wide">Organization</p>
            <p className="text-sm font-bold text-white mt-0.5 truncate">{user.organization.name}</p>
          </div>
        )}

        <nav className="flex-1 px-3 py-5 space-y-0.5">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 mb-3">Navigation</p>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn("nav-item", isActive
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "text-white/60 hover:text-white hover:bg-white/5")
              }
            >
              <Icon size={17} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{first} {last}</p>
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

      <div className="ml-[240px] flex-1 flex flex-col min-h-screen overflow-y-auto">
        <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-purple-600" />
            <span className="text-sm font-semibold text-slate-700">Hospital Admin Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin/notifications" className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell size={18} className="text-slate-500" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <span className="text-sm font-medium text-slate-700">{first} {last}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
