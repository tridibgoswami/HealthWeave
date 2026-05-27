import React, { useEffect, useRef, useState } from "react";
import { Send, Sparkles, User, AlertCircle, Loader2, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { chatApi } from "../../services/api";
import { cn } from "../../utils/cn";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { id: string; title: string; date: string; type: string }[];
}

const SUGGESTIONS = [
  "Why do I experience fatigue repeatedly?",
  "Show my cholesterol trend over 5 years",
  "Which medication may have caused my acidity?",
  "Compare my HbA1c across all lab reports",
  "What changed in my health after 2022?",
  "Summarise my kidney health history",
];

export function HealthChat({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLoadingHistory(true);
    chatApi.getMessages(sessionId)
      .then((res) => setMessages(res.data || []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text = input) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((p) => [...p, { id: Date.now().toString(), role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const res = await chatApi.sendMessage(sessionId, trimmed);
      setMessages((p) => [...p, {
        id: res.data.message_id || `${Date.now()}-ai`,
        role: "assistant",
        content: res.data.content,
        sources: res.data.sources,
      }]);
    } catch {
      setMessages((p) => [...p, {
        id: `${Date.now()}-err`,
        role: "assistant",
        content: "I'm having trouble accessing your health data right now. Please try again in a moment.",
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-100 shadow-card-hover overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-blue to-purple-600 flex items-center justify-center shadow-blue-glow shrink-0">
          <Sparkles size={15} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="font-extrabold text-slate-900 text-sm tracking-tight">HealthWeave AI</p>
          <p className="text-xs text-slate-400">Analysing your complete health history</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Clear conversation"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 min-h-0">
        {loadingHistory ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-slate-200" />
          </div>
        ) : messages.length === 0 ? (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 mx-auto flex items-center justify-center mb-4 border border-blue-100">
                <Sparkles size={28} className="text-brand-blue" />
              </div>
              <p className="font-extrabold text-slate-900 text-base tracking-tight">Ask anything about your health</p>
              <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                I can analyse your uploaded reports, explain trends, compare biomarkers,
                and give you personalised health insights.
              </p>
            </div>
            <div>
              <p className="section-label mb-3 text-center">Suggested questions</p>
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-xs px-3 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:border-brand-blue/40 hover:bg-blue-50 hover:text-brand-blue transition-all leading-snug font-medium"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                msg.role === "assistant"
                  ? "bg-gradient-to-br from-brand-blue to-purple-600"
                  : "bg-slate-200"
              )}>
                {msg.role === "assistant"
                  ? <Sparkles size={12} className="text-white" />
                  : <User size={12} className="text-slate-500" />
                }
              </div>

              <div className={cn(
                "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "assistant"
                  ? "bg-slate-50 border border-slate-100 text-slate-800"
                  : "bg-brand-blue text-white rounded-tr-sm"
              )}>
                {msg.role === "assistant" ? (
                  <div className="prose-chat">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200">
                    <p className="section-label mb-1.5">Based on your records</p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((s) => (
                        <span key={s.id}
                          className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-600 font-semibold">
                          {s.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-blue to-purple-600 flex items-center justify-center shrink-0">
              <Sparkles size={12} className="text-white" />
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 bg-brand-blue rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Disclaimer */}
      <div className="px-5 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-2 shrink-0">
        <AlertCircle size={11} className="text-amber-500 shrink-0" />
        <p className="text-[10px] text-amber-700 leading-snug">
          AI insights are for informational purposes only. Always consult a qualified healthcare professional.
        </p>
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-3 shrink-0">
        <div className={cn(
          "flex items-end gap-2 bg-slate-50 border rounded-2xl px-3 py-2 transition-all",
          "focus-within:border-brand-blue/50 focus-within:ring-2 focus-within:ring-blue-50 border-slate-200"
        )}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask about your health history…"
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-800 placeholder-slate-400 max-h-28 py-1"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0",
              input.trim() && !loading
                ? "bg-brand-blue text-white hover:bg-brand-blue-dark shadow-blue-glow"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
          >
            <Send size={13} />
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
