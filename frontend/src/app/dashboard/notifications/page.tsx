"use client";

import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import { useSidebar } from "../layout";

export default function NotificationsPage() {
  const { toggleSidebar } = useSidebar();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newPriority, setNewPriority] = useState("normal");

  const loadNotifications = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await api.getNotifications(token);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const handleMarkRead = async (id: number) => {
    const token = getToken();
    if (!token) return;
    await api.markNotificationRead(token, id);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    const token = getToken();
    if (!token) return;
    await api.markAllRead(token);
    loadNotifications();
  };

  const handleDelete = async (id: number) => {
    const token = getToken();
    if (!token) return;
    await api.deleteNotification(token, id);
    loadNotifications();
  };

  const handleCreate = async () => {
    const token = getToken();
    if (!token || !newTitle.trim()) return;
    await api.createReminder(token, {
      title: newTitle,
      message: newMessage,
      category: newCategory,
      priority: newPriority,
    });
    setNewTitle("");
    setNewMessage("");
    setShowCreate(false);
    loadNotifications();
  };

  const priorityColors: Record<string, string> = {
    high: "bg-red-100 text-red-700 border-red-200",
    normal: "bg-blue-100 text-blue-700 border-blue-200",
    low: "bg-gray-100 text-gray-600 border-gray-200",
  };

  const categoryIcons: Record<string, string> = {
    production: "📦",
    analytics: "📊",
    system: "⚙️",
    general: "📌",
    writing: "✍️",
    teaching: "📚",
  };

  return (
    <>
      <Header title="Notifications" onMenuToggle={toggleSidebar} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Actions bar */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-foreground">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border rounded-lg"
            >
              Mark all read
            </button>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
            >
              + New Reminder
            </button>
          </div>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="bg-card-bg rounded-xl border border-card-border p-6 space-y-4">
            <h3 className="font-semibold">Create Reminder</h3>
            <input
              className="w-full p-2 border rounded-lg text-sm"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <textarea
              className="w-full p-2 border rounded-lg text-sm"
              placeholder="Message"
              rows={3}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <div className="flex gap-4">
              <select
                className="p-2 border rounded-lg text-sm"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                <option value="general">General</option>
                <option value="production">Production</option>
                <option value="writing">Writing</option>
                <option value="teaching">Teaching</option>
                <option value="system">System</option>
              </select>
              <select
                className="p-2 border rounded-lg text-sm"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Notification list */}
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id as number}
              className={`bg-card-bg rounded-xl border p-4 flex items-start gap-4 transition-colors ${
                n.read ? "border-card-border opacity-60" : "border-indigo-200 bg-indigo-50/30"
              }`}
            >
              <div className="text-2xl mt-0.5">
                {categoryIcons[(n.category as string) || "general"] || "📌"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-medium text-sm ${n.read ? "text-gray-500" : "text-gray-800"}`}>
                    {n.title as string}
                  </h4>
                  <span className={`text-xs px-2 py-0.5 rounded border ${
                    priorityColors[(n.priority as string) || "normal"]
                  }`}>
                    {n.priority as string}
                  </span>
                  {n.type === "alert" && (
                    <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">
                      alert
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{n.message as string}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {n.created_at ? new Date(n.created_at as string).toLocaleString() : ""}
                </p>
              </div>
              <div className="flex gap-1">
                {!n.read && (
                  <button
                    onClick={() => handleMarkRead(n.id as number)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded"
                    title="Mark as read"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => handleDelete(n.id as number)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <p className="text-center text-gray-400 py-12">No notifications</p>
          )}
        </div>
      </main>
    </>
  );
}
