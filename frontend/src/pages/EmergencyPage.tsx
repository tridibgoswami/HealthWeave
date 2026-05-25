import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { emergencyApi } from "../services/api";
import { Heart, Phone, AlertTriangle } from "lucide-react";

export function EmergencyPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (token) {
      emergencyApi.getPassportByToken(token)
        .then((r) => setData(r.data))
        .catch(() => setError(true));
    }
  }, [token]);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
      <div className="text-center">
        <AlertTriangle size={48} className="text-red-400 mx-auto mb-3" />
        <p className="font-bold text-red-800">Emergency profile not found or expired</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-red-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-red-600 text-white rounded-2xl p-5 mb-4 flex items-center gap-3">
          <Heart size={24} />
          <div>
            <p className="font-bold text-lg">Emergency Health Passport</p>
            <p className="text-red-200 text-sm">HealthWeave – Critical Medical Information</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { label: "Blood Group", value: data.blood_group, highlight: true },
            { label: "Allergies", value: data.allergies?.join(", ") || "None known" },
            { label: "Chronic Conditions", value: data.chronic_conditions?.join(", ") || "None" },
            { label: "Current Medications", value: data.critical_medicines?.map((m: any) => m.name || m).join(", ") || "None" },
            { label: "Implants", value: data.implants?.join(", ") || "None" },
            { label: "DNR", value: data.do_not_resuscitate ? "YES – Do Not Resuscitate" : "No" },
          ].map(({ label, value, highlight }) => (
            <div key={label} className={`bg-white rounded-xl p-4 border ${highlight ? "border-red-200" : "border-gray-100"}`}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
              <p className={`font-bold mt-0.5 ${highlight ? "text-red-600 text-2xl" : "text-gray-900"}`}>{value}</p>
            </div>
          ))}

          {data.emergency_contacts?.length > 0 && (
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Emergency Contacts</p>
              {data.emergency_contacts.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-700">{c.name} ({c.relation})</span>
                  <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-blue-600 font-medium text-sm">
                    <Phone size={12} /> {c.phone}
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-center text-gray-400 mt-4">
          {data.disclaimer} Last updated: {data.last_updated?.split("T")[0]}
        </p>
      </div>
    </div>
  );
}
