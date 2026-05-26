import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, QrCode, Plus, RefreshCw, Heart, AlertTriangle, Phone } from "lucide-react";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { emergencyApi } from "../services/api";
import { cn } from "../utils/cn";
import toast from "react-hot-toast";

export function PassportPage() {
  const qc = useQueryClient();
  const [showQR, setShowQR] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["my-passport"],
    queryFn: () => emergencyApi.getMyPassport(),
    retry: false,
  });

  const autoUpdate = useMutation({
    mutationFn: () => emergencyApi.autoUpdate(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-passport"] });
      toast.success("Emergency passport updated from your latest records");
    },
    onError: () => toast.error("Auto-update failed. Please try again."),
  });

  const passport = data?.data;
  const qrUrl = passport?.qr_token
    ? `${window.location.origin}/emergency/${passport.qr_token}`
    : null;

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <ShieldAlert size={18} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Emergency Passport</h1>
            <p className="text-sm text-gray-500">QR code for first responders with critical health info</p>
          </div>
        </div>
        {passport && (
          <button
            onClick={() => autoUpdate.mutate()}
            disabled={autoUpdate.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={autoUpdate.isPending ? "animate-spin" : ""} />
            Auto-update
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !passport ? (
        /* No passport yet */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={32} className="text-red-400" />
          </div>
          <p className="font-semibold text-gray-800 mb-1">No Emergency Passport Yet</p>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            Create your emergency passport so first responders can access critical health info
            via a QR code — even when you can't speak.
          </p>
          <button
            onClick={() => autoUpdate.mutate()}
            disabled={autoUpdate.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            <Plus size={15} />
            {autoUpdate.isPending ? "Creating…" : "Create Passport"}
          </button>
          <p className="text-xs text-gray-400 mt-3">
            Passport is auto-generated from your uploaded health records
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* QR Card */}
          <div className="bg-white rounded-2xl border-2 border-red-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-bold text-gray-900">Emergency QR Code</p>
                <p className="text-xs text-gray-500 mt-0.5">Show this to first responders</p>
              </div>
              <button
                onClick={() => setShowQR((v) => !v)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors",
                  showQR
                    ? "bg-gray-100 text-gray-700 border-gray-200"
                    : "bg-red-500 text-white border-red-500 hover:bg-red-600"
                )}
              >
                <QrCode size={14} />
                {showQR ? "Hide QR" : "Show QR"}
              </button>
            </div>

            {showQR && qrUrl && (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-sm">
                  <QRCode value={qrUrl} size={180} level="M" />
                </div>
                <p className="text-xs text-gray-500 text-center max-w-xs">
                  Scanning this QR code takes first responders to your emergency profile without requiring a login
                </p>
                <a
                  href={qrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Preview emergency page →
                </a>
              </div>
            )}
          </div>

          {/* Critical Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="font-bold text-gray-900 mb-4">Critical Health Information</p>
            <div className="grid grid-cols-2 gap-4">
              {passport.blood_group && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                  <Heart size={18} className="text-red-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-red-500 font-semibold uppercase">Blood Group</p>
                    <p className="text-lg font-bold text-red-700">{passport.blood_group}</p>
                  </div>
                </div>
              )}

              {passport.do_not_resuscitate && (
                <div className="flex items-center gap-3 bg-red-100 border border-red-200 rounded-xl p-4">
                  <AlertTriangle size={18} className="text-red-600 shrink-0" />
                  <div>
                    <p className="text-[10px] text-red-600 font-bold uppercase">DNR Order</p>
                    <p className="text-sm font-bold text-red-700">Do Not Resuscitate</p>
                  </div>
                </div>
              )}
            </div>

            {passport.allergies?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Allergies</p>
                <div className="flex flex-wrap gap-2">
                  {passport.allergies.map((a: string) => (
                    <span key={a} className="text-xs bg-red-50 border border-red-100 text-red-700 font-medium px-3 py-1 rounded-full">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {passport.current_medications?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Current Medications</p>
                <div className="flex flex-wrap gap-2">
                  {passport.current_medications.map((m: string) => (
                    <span key={m} className="text-xs bg-blue-50 border border-blue-100 text-blue-700 font-medium px-3 py-1 rounded-full">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {passport.chronic_conditions?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Chronic Conditions</p>
                <div className="flex flex-wrap gap-2">
                  {passport.chronic_conditions.map((c: string) => (
                    <span key={c} className="text-xs bg-amber-50 border border-amber-100 text-amber-700 font-medium px-3 py-1 rounded-full">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Emergency contacts */}
          {passport.emergency_contacts?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="font-bold text-gray-900 mb-4">Emergency Contacts</p>
              <div className="space-y-3">
                {passport.emergency_contacts.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <Phone size={14} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.relationship} · {c.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
