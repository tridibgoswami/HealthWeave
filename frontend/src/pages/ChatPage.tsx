import React, { useEffect, useState } from "react";
import { HealthChat } from "../components/chat/HealthChat";
import { chatApi } from "../services/api";

export function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    chatApi.createSession({ title: "Health Conversation", session_type: "general" })
      .then((res) => setSessionId(res.data.session_id))
      .catch(() => {});
  }, []);

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen">
      <HealthChat sessionId={sessionId} />
    </div>
  );
}
