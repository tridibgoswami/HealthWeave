import React, { useEffect, useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { chatApi } from "../services/api";
import { HealthChat } from "../components/chat/HealthChat";

export function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    chatApi
      .createSession({ title: "Health Chat", session_type: "health_query" })
      .then((res) => setSessionId(res.data.session_id))
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={24} className="text-red-400" />
          </div>
          <p className="font-semibold text-gray-700">Could not start chat session</p>
          <p className="text-sm text-gray-400 mt-1">Ensure the backend is running, then refresh.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
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
          <Loader2 size={28} className="animate-spin text-blue-500" />
          <p className="text-sm text-gray-400 font-medium">Starting AI session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6">
      <div className="mb-5 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">AI Health Assistant</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Ask anything about your health history, reports, biomarkers, or medications
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <HealthChat sessionId={sessionId} />
      </div>
    </div>
  );
}
