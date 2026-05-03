"use client";

import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import { useSidebar } from "../layout";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const platformColors: Record<string, string> = {
  youtube: "bg-red-100 text-red-700",
  podcast: "bg-purple-100 text-purple-700",
  social: "bg-blue-100 text-blue-700",
  kdp: "bg-orange-100 text-orange-700",
  tpt: "bg-green-100 text-green-700",
  medium: "bg-gray-100 text-gray-700",
  general: "bg-indigo-100 text-indigo-700",
};

export default function CalendarPage() {
  const { toggleSidebar } = useSidebar();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newPlatform, setNewPlatform] = useState("general");
  const [newNotes, setNewNotes] = useState("");

  const loadEvents = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await api.getProductionCalendar(token, month + 1, year);
      setEvents(data.events);
    } catch { /* ignore */ }
  }, [month, year]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const handleCreate = async () => {
    const token = getToken();
    if (!token || !newTitle.trim() || !newDate) return;
    await api.createProductionEvent(token, {
      title: newTitle,
      date: newDate,
      platform: newPlatform,
      notes: newNotes,
    });
    setNewTitle("");
    setNewDate("");
    setNewNotes("");
    setShowCreate(false);
    loadEvents();
  };

  const handleDelete = async (id: number) => {
    const token = getToken();
    if (!token) return;
    await api.deleteProductionEvent(token, id);
    loadEvents();
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    return events.filter((e) => e.date === dateStr);
  };

  return (
    <>
      <Header title="Content Calendar" onMenuToggle={toggleSidebar} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Month navigation */}
        <div className="flex justify-between items-center">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-foreground">
            {MONTHS[month]} {year}
          </h2>
          <div className="flex gap-2">
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
            >
              + Add Event
            </button>
          </div>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="bg-card-bg rounded-xl border border-card-border p-6 space-y-4">
            <h3 className="font-semibold">New Event</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="p-2 border rounded-lg text-sm" placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <input className="p-2 border rounded-lg text-sm" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              <select className="p-2 border rounded-lg text-sm" value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)}>
                <option value="general">General</option>
                <option value="youtube">YouTube</option>
                <option value="podcast">Podcast</option>
                <option value="social">Social Media</option>
                <option value="kdp">KDP</option>
                <option value="tpt">TPT</option>
                <option value="medium">Medium</option>
              </select>
              <input className="p-2 border rounded-lg text-sm" placeholder="Notes" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
            </div>
            <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              Create Event
            </button>
          </div>
        )}

        {/* Calendar grid */}
        <div className="bg-card-bg rounded-xl border border-card-border overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-50">
            {DAYS.map((d) => (
              <div key={d} className="px-2 py-3 text-center text-xs font-medium text-gray-500 border-b">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const dayEvents = day ? getEventsForDay(day) : [];
              const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
              return (
                <div key={i} className={`min-h-[100px] border-b border-r p-1 ${day ? "bg-white" : "bg-gray-50"}`}>
                  {day && (
                    <>
                      <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-indigo-600 text-white" : "text-gray-700"}`}>
                        {day}
                      </div>
                      {dayEvents.map((ev) => (
                        <div
                          key={ev.id as number}
                          className={`text-xs px-1 py-0.5 mb-0.5 rounded truncate cursor-pointer ${platformColors[(ev.platform as string) || "general"]}`}
                          title={`${ev.title as string}\n${ev.notes as string}`}
                          onClick={() => handleDelete(ev.id as number)}
                        >
                          {ev.title as string}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Event list */}
        <div className="bg-card-bg rounded-xl border border-card-border p-6">
          <h3 className="font-semibold mb-4">Upcoming Events</h3>
          <div className="space-y-2">
            {events
              .sort((a, b) => (a.date as string).localeCompare(b.date as string))
              .map((ev) => (
                <div key={ev.id as number} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded ${platformColors[(ev.platform as string) || "general"]}`}>
                      {ev.platform as string}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{ev.title as string}</p>
                      <p className="text-xs text-gray-500">{ev.date as string} {ev.notes ? `— ${ev.notes as string}` : ""}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    ev.status === "completed" ? "bg-green-100 text-green-700" :
                    ev.status === "in_progress" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {ev.status as string}
                  </span>
                </div>
              ))}
            {events.length === 0 && (
              <p className="text-center text-gray-400 py-4">No events this month</p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
