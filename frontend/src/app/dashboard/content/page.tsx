"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import type { CalendarEvent, ContentDraft } from "@/lib/api";
import Header from "@/components/Header";

export default function ContentPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("novel");
  const [scheduledDate, setScheduledDate] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.getCalendarEvents(token).then(setEvents);
    api.getContentDrafts(token).then(setDrafts);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const event = await api.createCalendarEvent(token, {
      title,
      event_type: eventType,
      scheduled_date: new Date(scheduledDate).toISOString(),
    });
    setEvents([...events, event].sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()));
    setTitle("");
    setScheduledDate("");
    setShowForm(false);
  }

  const typeColors: Record<string, string> = {
    novel: "bg-purple-100 text-purple-700",
    workbook: "bg-blue-100 text-blue-700",
    episode: "bg-orange-100 text-orange-700",
    medium: "bg-green-100 text-green-700",
    youtube: "bg-red-100 text-red-700",
    freelance: "bg-teal-100 text-teal-700",
  };

  return (
    <>
      <Header title="Content & Calendar" />
      <main className="flex-1 overflow-y-auto p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <p className="text-sm text-muted mb-1">Scheduled Events</p>
            <p className="text-3xl font-bold text-primary">{events.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <p className="text-sm text-muted mb-1">Content Drafts</p>
            <p className="text-3xl font-bold text-warning">{drafts.length}</p>
          </div>
        </div>

        <div className="bg-card-bg rounded-xl border border-card-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Content Calendar</h3>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm transition-colors"
            >
              {showForm ? "Cancel" : "+ Add Event"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event title"
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900"
                  required
                />
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900"
                >
                  {["novel", "workbook", "episode", "medium", "youtube", "freelance"].map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900"
                  required
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition-colors">
                Add Event
              </button>
            </form>
          )}

          {events.length === 0 ? (
            <p className="text-muted text-sm">No calendar events yet.</p>
          ) : (
            <div className="space-y-3">
              {events.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[e.event_type] || "bg-gray-100 text-gray-700"}`}>
                      {e.event_type}
                    </span>
                    <p className="font-medium text-foreground">{e.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted">{new Date(e.scheduled_date).toLocaleDateString()}</p>
                    <p className="text-xs text-muted">{new Date(e.scheduled_date).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card-bg rounded-xl border border-card-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Platform Drafts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {["Pocket FM", "Medium", "Fiverr", "Email"].map((platform) => {
              const count = drafts.filter((d) => d.platform === platform.toLowerCase().replace(" ", "_")).length;
              return (
                <div key={platform} className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium text-foreground">{platform}</p>
                  <p className="text-2xl font-bold text-primary mt-1">{count}</p>
                  <p className="text-xs text-muted">drafts</p>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
