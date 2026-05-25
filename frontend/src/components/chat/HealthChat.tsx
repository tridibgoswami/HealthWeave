/**
 * HealthWeave – AI Health Memory Chat
 * Conversational interface over the patient's lifetime health data.
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, User, AlertCircle, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { chatApi } from "../../services/api";
import { cn } from "../../utils/cn";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { id: string; title: string; date: string; type: string }[];
  created_at?: string;
}

const SUGGESTION_PROMPTS = [
  "Why do I feel fatigue repeatedly?",
  "Show my cholesterol trend for the last 5 years.",
  "Which medicine may have caused acidity?",
  "Compare my HbA1c across all reports.",
  "What changed in my health after 2022?",
  "Summarize my kidney health history.",
];

export function HealthChat({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadHistory();
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await chatApi.getMessages(sessionId);
      setMessages(res.data);
    } catch {
      // New session
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSend = async (text = input) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await chatApi.sendMessage(sessionId, text.trim());
      const assistantMsg: Message = {
        id: res.data.message_id,
        role: "assistant",
        content: res.data.content,
        sources: res.data.sources,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: Date.now().toString() + "-err",
        role: "assistant",
        content:
          "I'm having trouble accessing your health data right now. Please try again in a moment.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Sparkles size={18} className="text-white" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">HealthWeave AI</p>
          <p className="text-xs text-gray-500">Your health memory assistant</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isLoadingHistory ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 mx-auto flex items-center justify-center mb-3">
                <Sparkles size={24} className="text-blue-500" />
              </div>
              <p className="font-semibold text-gray-900">Ask me about your health</p>
              <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                I can analyze your reports, explain trends, and provide preventive insights
                based on your complete health history.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {SUGGESTION_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  className="text-left text-sm px-3 py-2 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-gray-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1",
                    msg.role === "assistant"
                      ? "bg-gradient-to-br from-blue-500 to-purple-600"
                      : "bg-gray-200"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <Sparkles size={12} className="text-white" />
                  ) : (
                    <User size={12} className="text-gray-600" />
                  )}
                </div>

                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                    msg.role === "assistant"
                      ? "bg-gray-50 border border-gray-100 text-gray-800"
                      : "bg-blue-600 text-white"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}

                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-1 font-medium">Based on your records:</p>
                      <div className="flex flex-wrap gap-1">
                        {msg.sources.map((s) => (
                          <span
                            key={s.id}
                            className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600"
                          >
                            {s.title} ({s.date})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
              <Sparkles size={12} className="text-white" />
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Disclaimer */}
      <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-start gap-2">
        <AlertCircle size={12} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          AI insights are for informational purposes only. Always consult a healthcare professional.
        </p>
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2">
        <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-blue-400 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your health history…"
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-800 placeholder-gray-400 max-h-24"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0",
              input.trim() && !isLoading
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-400"
            )}
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-xs text-center text-gray-400 mt-1">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
