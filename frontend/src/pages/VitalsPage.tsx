import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import {
  Activity, Heart, Thermometer, Wind, Scale, Droplets,
  Plus, Trash2, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea,
} from "recharts";
import { vitalsApi } from "../services/api";
import { cn } from "../utils/cn";
import toast from "react-hot-toast";

// ── Preset metadata ────────────────────────────────────────────────────────────

const PRESET_META: Record<string, { icon: any; color: string; bgColor: string }> = {
  blood_glucose:            { icon: Droplets,    color: "text-blue-600",   bgColor: "bg-blue-50" },
  blood_pressure_systolic:  { icon: Heart,       color: "text-red-600",    bgColor: "bg-red-50" },
  blood_pressure_diastolic: { icon: Heart,       color: "text-rose-600",   bgColor: "bg-rose-50" },
  weight:                   { icon: Scale,       color: "text-purple-600", bgColor: "bg-purple-50" },
  heart_rate:               { icon: Activity,    color: "text-pink-600",   bgColor: "bg-pink-50" },
  oxygen_saturation:        { icon: Wind,        color: "text-cyan-600",   bgColor: "bg-cyan-50" },
  temperature:              { icon: Thermometer, color: "text-orange-600", bgColor: "bg-orange-50" },
  blood_glucose_pp:         { icon: Droplets,    color: "text-indigo-600", bgColor: "bg-indigo-50" },
};

// Fallback display name formatting
function displayName(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Date label helper
function dateLabel(dateStr: string) {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

// Trend icon
function TrendIcon({ trend }: { trend: string }) {
  if (trend === "rising")  return <TrendingUp size={13} className="text-red-500" />;
  if (trend === "falling") return <TrendingDown size={13} className="text-emerald-500" />;
  return <Minus size={13} className="text-slate-400" />;
}

// Custom tooltip for chart
const VitalsTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card p-2.5 text-xs">
      <p className="text-slate-400 mb-0.5">{label}</p>
      <p className="font-bold text-slate-800">
        {d.value} <span className="font-normal text-slate-400">{d.payload?.unit}</span>
      </p>
    </div>
  );
};

// ── Trend Chart ────────────────────────────────────────────────────────────────

function BiomarkerTrendChart({ name, entries, preset }: { name: string; entries: any[]; preset: any }) {
  const [open, setOpen] = useState(false);
  const meta = PRESET_META[name] || { icon: Activity, color: "text-slate-600", bgColor: "bg-slate-50" };
  const Icon = meta.icon;

  const chartData = [...entries]
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
    .map((e) => ({
      date: format(parseISO(e.entry_date), "MMM d"),
      value: e.value_numeric,
      unit: e.unit,
    }));

  const refMin = preset?.reference_range_min ?? null;
  const refMax = preset?.reference_range_max ?? null;

  const vals = chartData.map((d) => d.value);
  const yMin = Math.min(...vals, refMin ?? Infinity) * 0.9;
  const yMax = Math.max(...vals, refMax ?? -Infinity) * 1.1;

  // Simple trend: compare last two
  const last = entries[entries.length - 1]?.value_numeric;
  const prev = entries[entries.length - 2]?.value_numeric;
  const trend = prev == null || last == null ? "stable" : last > prev ? "rising" : last < prev ? "falling" : "stable";

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden mb-3">
      <button
        className="w-full text-left p-4 flex items-center justify-between"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", meta.bgColor)}>
            <Icon size={15} className={meta.color} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">
              {preset?.display_name || displayName(name)}
            </p>
            <p className="text-[11px] text-slate-400">{entries.length} readings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TrendIcon trend={trend} />
          {last != null && (
            <span className="text-sm font-black text-slate-900">
              {last} <span className="text-xs font-normal text-slate-400">{entries[entries.length - 1]?.unit}</span>
            </span>
          )}
          {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94A3B8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} domain={[yMin, yMax]} />
              <Tooltip content={<VitalsTooltip />} />
              {refMin != null && refMax != null && (
                <ReferenceArea y1={refMin} y2={refMax} fill="#D1FAE5" fillOpacity={0.5} />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke={meta.color.replace("text-", "").replace("-600", "")}
                strokeWidth={2.5}
                dot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: "#6366f1" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
          {refMin != null && refMax != null && (
            <p className="text-[10px] text-slate-400 text-center mt-1">
              Green band = normal range ({refMin}–{refMax} {entries[0]?.unit})
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function VitalsPage() {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const [selectedPreset, setSelectedPreset] = useState<any | null>(null);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [entryDate, setEntryDate] = useState(today);

  // Load presets
  const { data: presetsData, isLoading: presetsLoading } = useQuery({
    queryKey: ["vitals-presets"],
    queryFn: () => vitalsApi.getPresets(),
    staleTime: 10 * 60_000,
  });

  // Load recent entries
  const { data: entriesData, isLoading: entriesLoading } = useQuery({
    queryKey: ["vitals", "list", 30],
    queryFn: () => vitalsApi.list({ days: 30 }),
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      vitalsApi.create({
        biomarker_name: selectedPreset.biomarker_name,
        value_numeric: parseFloat(value),
        unit: selectedPreset.unit,
        entry_date: entryDate,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast.success("Vital logged!");
      setValue("");
      setNotes("");
      setEntryDate(today);
      setSelectedPreset(null);
      qc.invalidateQueries({ queryKey: ["vitals"] });
    },
    onError: () => toast.error("Failed to save vital"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vitalsApi.delete(id),
    onSuccess: () => {
      toast.success("Entry deleted");
      qc.invalidateQueries({ queryKey: ["vitals"] });
    },
  });

  const presets: any[] = presetsData?.data?.presets || presetsData?.data || [];
  const entries: any[] = entriesData?.data?.entries || entriesData?.data || [];

  // Group entries by date (last 7 days shown)
  const grouped: Record<string, any[]> = {};
  entries.forEach((e: any) => {
    const key = e.entry_date?.slice(0, 10) || "unknown";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a)).slice(0, 7);

  // Group entries by biomarker for trend charts
  const byBiomarker: Record<string, any[]> = {};
  entries.forEach((e: any) => {
    const name = e.biomarker_name;
    if (!byBiomarker[name]) byBiomarker[name] = [];
    byBiomarker[name].push(e);
  });
  const trendBiomarkers = Object.entries(byBiomarker).filter(([, arr]) => arr.length >= 2);

  const handleSave = () => {
    if (!value || isNaN(parseFloat(value))) {
      toast.error("Please enter a valid number");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <Activity size={18} className="text-blue-600" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Daily Vitals</h1>
          </div>
          <p className="text-sm text-slate-400 ml-[52px]">Log and track your daily health measurements</p>
        </div>
        <button
          onClick={() => setSelectedPreset(null)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={15} />
          Log Entry
        </button>
      </div>

      {/* Preset Buttons */}
      <div className="hw-card p-5 mb-6">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Quick Add</p>
        {presetsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="skeleton h-16 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(presets.length > 0
              ? presets
              : Object.keys(PRESET_META).map((k) => ({ biomarker_name: k, display_name: displayName(k), unit: "" }))
            ).map((preset: any) => {
              const name = preset.biomarker_name;
              const meta = PRESET_META[name] || { icon: Activity, color: "text-slate-600", bgColor: "bg-slate-50" };
              const Icon = meta.icon;
              const isSelected = selectedPreset?.biomarker_name === name;
              return (
                <button
                  key={name}
                  onClick={() => setSelectedPreset(isSelected ? null : preset)}
                  className={cn(
                    "hw-card p-3 text-center cursor-pointer hover:-translate-y-0.5 transition-all flex flex-col items-center gap-2",
                    isSelected ? "ring-2 ring-brand-blue bg-blue-50" : "hover:shadow-card"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", meta.bgColor)}>
                    <Icon size={15} className={meta.color} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 leading-tight">
                    {preset.display_name || displayName(name)}
                  </span>
                  {preset.unit && (
                    <span className="text-[10px] text-slate-400">{preset.unit}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Log Form */}
      {selectedPreset && (
        <div className="hw-card p-5 mb-6 border-2 border-brand-blue/20">
          <p className="text-sm font-bold text-slate-800 mb-4">
            Log: {selectedPreset.display_name || displayName(selectedPreset.biomarker_name)}
            {selectedPreset.unit && <span className="text-slate-400 font-normal ml-1">({selectedPreset.unit})</span>}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="section-label block mb-1.5">Value *</label>
              <input
                type="number"
                step="0.1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={selectedPreset.unit || "Enter value"}
                className="hw-input"
                autoFocus
              />
            </div>
            <div>
              <label className="section-label block mb-1.5">Date</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="hw-input"
                max={today}
              />
            </div>
            <div>
              <label className="section-label block mb-1.5">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes..."
                className="hw-input"
              />
            </div>
          </div>
          {selectedPreset.reference_range_min != null && selectedPreset.reference_range_max != null && (
            <p className="text-xs text-slate-400 mb-4">
              Normal range: {selectedPreset.reference_range_min}–{selectedPreset.reference_range_max} {selectedPreset.unit}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={createMutation.isPending}
              className="btn-primary text-sm"
            >
              {createMutation.isPending ? "Saving…" : "Save Entry"}
            </button>
            <button
              onClick={() => { setSelectedPreset(null); setValue(""); setNotes(""); setEntryDate(today); }}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Recent Entries */}
      <div className="mb-6">
        <h2 className="text-base font-bold text-slate-800 mb-4">Recent Entries</h2>
        {entriesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 shadow-card">
            <Activity size={28} className="text-slate-200 mx-auto mb-3" />
            <p className="font-bold text-slate-600 mb-1">No vitals logged yet</p>
            <p className="text-sm text-slate-400">Click a preset above to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDates.map((date) => (
              <div key={date}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {dateLabel(date)}
                </p>
                <div className="space-y-2">
                  {grouped[date].map((entry: any) => {
                    const meta = PRESET_META[entry.biomarker_name] || { icon: Activity, color: "text-slate-600", bgColor: "bg-slate-50" };
                    const Icon = meta.icon;
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm"
                      >
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", meta.bgColor)}>
                          <Icon size={14} className={meta.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {entry.display_name || displayName(entry.biomarker_name)}
                          </p>
                          {entry.notes && (
                            <p className="text-xs text-slate-400 truncate">{entry.notes}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-slate-900">
                            {entry.value_numeric}{" "}
                            <span className="text-xs font-normal text-slate-400">{entry.unit}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => deleteMutation.mutate(entry.id)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trend Charts */}
      {trendBiomarkers.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-slate-800 mb-4">Trends (Last 30 Days)</h2>
          {trendBiomarkers.map(([name, bioEntries]) => {
            const preset = presets.find((p: any) => p.biomarker_name === name);
            return (
              <BiomarkerTrendChart
                key={name}
                name={name}
                entries={bioEntries}
                preset={preset}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
