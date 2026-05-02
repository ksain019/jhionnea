"use client";

import { useEffect, useRef, useState } from "react";
import { getToken, getUser } from "@/lib/auth";
import { api } from "@/lib/api";
import type { ChatMessage } from "@/lib/api";
import Header from "@/components/Header";

interface DisplayMessage {
  chatMsg: ChatMessage;
  screenshot?: string;
  browserUrl?: string;
}

export default function ChatPage() {
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedScreenshot, setExpandedScreenshot] = useState<string | null>(null);
  const user = getUser();

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.getChatMessages(token).then((msgs) => {
      setDisplayMessages(msgs.map((m) => ({ chatMsg: m })));
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const token = getToken();
    if (!token) return;

    setSending(true);
    try {
      const reply = await api.sendChatMessage(token, input.trim());
      const userDisplay: DisplayMessage = { chatMsg: reply.user_message };
      const assistantDisplay: DisplayMessage = {
        chatMsg: reply.assistant_message,
        screenshot: reply.browser_screenshot ?? undefined,
        browserUrl: reply.browser_url ?? undefined,
      };
      setDisplayMessages((prev) => [...prev, userDisplay, assistantDisplay]);
      setInput("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <>
      <Header title="Chat with Jhionnea" />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {displayMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-indigo-600">J</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Hi {user?.full_name || "there"}! I&apos;m Jhionnea.
              </h3>
              <p className="text-muted max-w-md">
                Your private AI employee. Ask me anything about writing,
                teaching, content, business, or analytics. I can also browse
                the web for you!
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 max-w-lg">
                {[
                  "Help me plan a new novel",
                  "Create a lesson plan for 3rd grade",
                  "Search for romance novel trends",
                  "Go to medium.com",
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

          {displayMessages.map((dm) => (
            <div key={dm.chatMsg.id}>
              <div
                className={`flex ${dm.chatMsg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    dm.chatMsg.role === "user"
                      ? "bg-primary text-white rounded-br-md"
                      : "bg-card-bg border border-card-border text-foreground rounded-bl-md"
                  }`}
                >
                  {dm.chatMsg.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                        J
                      </span>
                      <span className="text-xs font-medium text-primary">
                        Jhionnea
                      </span>
                      {dm.browserUrl && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Browsed web
                        </span>
                      )}
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {dm.chatMsg.content.split("\n").map((line, i) => {
                      if (line.startsWith("- **")) {
                        const parts = line.match(/- \*\*(.+?)\*\*(.*)/);
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
                  <p
                    className={`text-xs mt-1 ${dm.chatMsg.role === "user" ? "text-indigo-200" : "text-muted"}`}
                  >
                    {formatTime(dm.chatMsg.created_at)}
                  </p>
                </div>
              </div>

              {dm.screenshot && (
                <div className="flex justify-start mt-2 ml-8">
                  <div className="bg-card-bg border border-card-border rounded-xl p-2 max-w-[70%]">
                    <div className="flex items-center gap-2 mb-2">
                      <svg
                        className="w-4 h-4 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                        />
                      </svg>
                      <span className="text-xs text-muted truncate">
                        {dm.browserUrl}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedScreenshot(
                          expandedScreenshot === dm.screenshot
                            ? null
                            : dm.screenshot!
                        )
                      }
                      className="w-full cursor-pointer"
                    >
                      <img
                        src={`data:image/jpeg;base64,${dm.screenshot}`}
                        alt="Browser screenshot"
                        className="rounded-lg w-full border border-gray-200"
                      />
                    </button>
                    <p className="text-xs text-muted mt-1 text-center">
                      Click to {expandedScreenshot === dm.screenshot ? "collapse" : "expand"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-card-bg border border-card-border rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                    J
                  </span>
                  <span className="text-xs font-medium text-primary">
                    Jhionnea
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted">
                  <span className="inline-block w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  Working on it...
                </div>
              </div>
            </div>
          )}

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
              placeholder="Ask Jhionnea anything... (try: 'search for...' or 'go to example.com')"
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

      {expandedScreenshot && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-8"
          onClick={() => setExpandedScreenshot(null)}
        >
          <div className="max-w-5xl w-full">
            <img
              src={`data:image/jpeg;base64,${expandedScreenshot}`}
              alt="Browser screenshot expanded"
              className="w-full rounded-xl shadow-2xl"
            />
            <p className="text-white text-center mt-4 text-sm">
              Click anywhere to close
            </p>
          </div>
        </div>
      )}
    </>
  );
}
