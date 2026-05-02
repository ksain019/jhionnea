"use client";

import { useEffect, useRef, useState } from "react";
import { getToken, getUser } from "@/lib/auth";
import { api } from "@/lib/api";
import type { ChatMessage } from "@/lib/api";
import Header from "@/components/Header";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = getUser();

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.getChatMessages(token).then(setMessages);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const token = getToken();
    if (!token) return;

    setSending(true);
    try {
      const reply = await api.sendChatMessage(token, input.trim());
      setMessages((prev) => [...prev, reply.user_message, reply.assistant_message]);
      setInput("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <>
      <Header title="Chat with Jhionnea" />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-indigo-600">J</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Hi {user?.full_name || "there"}! I&apos;m Jhionnea.
              </h3>
              <p className="text-muted max-w-md">
                Your private AI employee. Ask me anything about writing, teaching,
                content, business, or analytics. I&apos;m here to help!
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 max-w-lg">
                {[
                  "Help me plan a new novel",
                  "Create a lesson plan for 3rd grade",
                  "What can you do?",
                  "Show me my status",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-4 py-3 text-sm text-left bg-card-bg border border-card-border rounded-xl hover:border-primary hover:shadow-sm transition-all text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-white rounded-br-md"
                    : "bg-card-bg border border-card-border text-foreground rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                      J
                    </span>
                    <span className="text-xs font-medium text-primary">Jhionnea</span>
                  </div>
                )}
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content.split("\n").map((line, i) => {
                    if (line.startsWith("- **")) {
                      const parts = line.match(/- \*\*(.+?)\*\*(.*)/)
                      if (parts) {
                        return (
                          <div key={i} className="ml-2 my-0.5">
                            <span className="font-semibold">{parts[1]}</span>
                            {parts[2]}
                          </div>
                        );
                      }
                    }
                    if (line.startsWith("- ")) {
                      return (
                        <div key={i} className="ml-2 my-0.5">
                          &bull; {line.slice(2)}
                        </div>
                      );
                    }
                    return <div key={i}>{line || "\u00A0"}</div>;
                  })}
                </div>
                <p className={`text-xs mt-1 ${msg.role === "user" ? "text-indigo-200" : "text-muted"}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="border-t border-card-border bg-card-bg p-4"
        >
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message to Jhionnea..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition text-foreground text-sm"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="px-6 py-3 bg-primary hover:bg-primary-dark disabled:bg-gray-300 text-white rounded-xl font-medium transition-colors text-sm"
            >
              {sending ? (
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Send"
              )}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
