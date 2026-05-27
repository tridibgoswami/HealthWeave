import React, { useEffect, useState } from "react";
import { Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { chatApi } from "../services/api";
import { HealthChat } from "../components/chat/HealthChat";

export function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const init = () => {
    setError(false);
    setSessionId(null);
    chatApi
      .createSession({ title: "Health Chat", session_type: "health_query" })
      .then((res) => setSessionId(res.data.session_id))
      .catch(() => setError(true));
  };

  useEffect(() => { init(); }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
            <MessageSquare size={24} className="text-red-400" />
          </div>
          <p className="font-bold text-slate-800 mb-1">Could not start chat session</p>
          <p className="text-sm text-slate-400 mt-1 mb-5">Ensure the backend is running, then retry.</p>
          <button onClick={init} className="btn-primary">
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-brand-blue" />
          <p className="text-sm text-slate-400 font-medium">Starting AI session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6">
      <div className="mb-5 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-blue to-purple-600 rounded-xl flex items-center justify-center shadow-blue-glow">
            <MessageSquare size={17} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">AI Health Assistant</h1>
        </div>
        <p className="text-sm text-slate-400 ml-[52px]">Ask anything about your health history, reports, biomarkers, or medications</p>
      </div>
      <div className="flex-1 min-h-0">
        <HealthChat sessionId={sessionId} />
      </div>
    </div>
  );
}
