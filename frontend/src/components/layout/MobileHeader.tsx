import React from "react";
import { Link } from "react-router-dom";
import { Dna, Menu, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { intelligenceApi } from "../../services/api";
import { cn } from "../../utils/cn";

interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const { user } = useAuthStore();
  const first    = user?.profile?.first_name || "";
  const last     = user?.profile?.last_name  || "";
  const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "U";

  const { data: alertsData } = useQuery({
    queryKey: ["alerts", false],
    queryFn: () => intelligenceApi.getAlerts(false),
    staleTime: 5 * 60 * 1000,
  });
  const alertCount  = (alertsData?.data || []).length;
  const criticalCnt = (alertsData?.data || []).filter((a: any) => a.risk_level === "critical").length;

  return (
    <header
      className="lg:hidden flex items-center justify-between px-4 h-14 shrink-0 border-b border-white/10"
      style={{ background: "linear-gradient(135deg, #0A0F1E 0%, #0F172A 100%)" }}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center shadow-blue-glow">
          <Dna size={15} className="text-white" />
        </div>
        <span className="font-extrabold text-white text-sm tracking-tight">HealthWeave</span>
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Alerts bell */}
        <Link to="/alerts" className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
          <Bell size={18} />
          {alertCount > 0 && (
            <span className={cn(
              "absolute top-1 right-1 min-w-[14px] h-3.5 text-[9px] font-extrabold rounded-full flex items-center justify-center px-0.5 text-white",
              criticalCnt > 0 ? "bg-red-500 animate-pulse" : "bg-amber-500"
            )}>
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          )}
        </Link>

        {/* Avatar + hamburger */}
        <button
          onClick={onMenuClick}
          className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-white/10 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center text-white font-bold text-[11px] shrink-0">
            {initials}
          </div>
          <Menu size={16} className="text-slate-400" />
        </button>
      </div>
    </header>
  );
}
