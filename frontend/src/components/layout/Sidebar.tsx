import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Upload, Activity, MessageSquare,
  Bell, ShieldAlert, LogOut, Heart, User,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { intelligenceApi } from "../../services/api";
import { cn } from "../../utils/cn";

const NAV = [
  { to: "/",         icon: LayoutDashboard, label: "Dashboard",       end: true },
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

  const alertCount = (alertsData?.data || []).length;
  const first = user?.profile?.first_name || "User";
  const last  = user?.profile?.last_name  || "";
  const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "U";

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen fixed left-0 top-0 z-40 shadow-sm">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
            <Heart size={16} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">HealthWeave</p>
            <p className="text-[10px] text-gray-400 leading-tight">Health Intelligence Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2">Main Menu</p>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )
            }
          >
            <item.icon size={17} />
            <span className="flex-1">{item.label}</span>
            {item.badge && alertCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </NavLink>
        ))}

        <div className="pt-4 mt-2 border-t border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2">Emergency</p>
          <NavLink
            to="/passport"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-red-500 text-white"
                  : "text-red-500 hover:bg-red-50"
              )
            }
          >
            <ShieldAlert size={17} />
            <span>Emergency Passport</span>
          </NavLink>
        </div>
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-gray-100 space-y-0.5">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
            {initials || <User size={13} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{first} {last}</p>
            <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all w-full"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
