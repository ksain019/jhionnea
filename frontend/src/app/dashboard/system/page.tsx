"use client";

import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import { useSidebar } from "../layout";

type Tab = "health" | "audit" | "performance" | "backups" | "tasks";

export default function SystemPage() {
  const { toggleSidebar } = useSidebar();
  const [activeTab, setActiveTab] = useState<Tab>("health");

  // Health data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [healthData, setHealthData] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Audit log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [auditEntries, setAuditEntries] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Performance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [perfData, setPerfData] = useState<any>(null);

  // Backups
  const [backups, setBackups] = useState<
    Array<{ filename: string; size_mb: number; created: string }>
  >([]);
  const [backupLoading, setBackupLoading] = useState(false);

  // Tasks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tasks, setTasks] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [taskLog, setTaskLog] = useState<any[]>([]);

  const loadHealth = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setHealthLoading(true);
    try {
      const data = await api.getSystemHealth(token);
      setHealthData(data);
    } catch {
      /* ignore */
    }
    setHealthLoading(false);
  }, []);

  const loadAudit = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setAuditLoading(true);
    try {
      const data = await api.getAuditLog(token);
      setAuditEntries(data.entries);
    } catch {
      /* ignore */
    }
    setAuditLoading(false);
  }, []);

  const loadPerformance = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await api.getPerformance(token);
      setPerfData(data);
    } catch {
      /* ignore */
    }
  }, []);

  const loadBackups = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await api.getBackups(token);
      setBackups(data.backups);
    } catch {
      /* ignore */
    }
  }, []);

  const loadTasks = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [tasksData, logData] = await Promise.all([
        api.getScheduledTasks(token),
        api.getTaskLog(token),
      ]);
      setTasks(tasksData.tasks);
      setTaskLog(logData.entries);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (activeTab === "health") loadHealth();
    if (activeTab === "audit") loadAudit();
    if (activeTab === "performance") loadPerformance();
    if (activeTab === "backups") loadBackups();
    if (activeTab === "tasks") loadTasks();
  }, [activeTab, loadHealth, loadAudit, loadPerformance, loadBackups, loadTasks]);

  const handleBackup = async () => {
    const token = getToken();
    if (!token) return;
    setBackupLoading(true);
    try {
      await api.triggerBackup(token);
      await loadBackups();
    } catch {
      /* ignore */
    }
    setBackupLoading(false);
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "health", label: "Health Monitor", icon: "❤️" },
    { id: "audit", label: "Security Audit", icon: "🛡️" },
    { id: "performance", label: "Performance", icon: "📊" },
    { id: "backups", label: "Backups", icon: "💾" },
    { id: "tasks", label: "Automation", icon: "⚙️" },
  ];

  return (
    <>
      <Header title="System Monitor" onMenuToggle={toggleSidebar} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Health Monitor */}
        {activeTab === "health" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">
                System Health
              </h2>
              <button
                onClick={loadHealth}
                disabled={healthLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {healthLoading ? "Checking..." : "Run Health Check"}
              </button>
            </div>

            {healthData && (
              <>
                {/* Service Status */}
                <div className="bg-card-bg rounded-xl border border-card-border p-6">
                  <h3 className="font-semibold mb-4">Service Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {healthData.services &&
                      Object.entries(
                        healthData.services as Record<
                          string,
                          { status: string; error?: string; last_check?: string }
                        >
                      ).map(([name, info]) => (
                        <div
                          key={name}
                          className={`p-4 rounded-lg border ${
                            info.status === "healthy"
                              ? "bg-green-50 border-green-200"
                              : info.status === "not_configured"
                                ? "bg-yellow-50 border-yellow-200"
                                : "bg-red-50 border-red-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                info.status === "healthy"
                                  ? "bg-green-500"
                                  : info.status === "not_configured"
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                            />
                            <span className="font-medium capitalize">
                              {name}
                            </span>
                            <span
                              className={`text-xs ml-auto px-2 py-0.5 rounded ${
                                info.status === "healthy"
                                  ? "bg-green-100 text-green-700"
                                  : info.status === "not_configured"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {info.status}
                            </span>
                          </div>
                          {info.error && (
                            <p className="text-xs text-red-600 mt-2">
                              {info.error}
                            </p>
                          )}
                          {info.last_check && (
                            <p className="text-xs text-gray-500 mt-1">
                              Last check:{" "}
                              {new Date(info.last_check).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Uptime */}
                {healthData.uptime && (
                  <div className="bg-card-bg rounded-xl border border-card-border p-6">
                    <h3 className="font-semibold mb-2">Uptime</h3>
                    <p className="text-2xl font-bold text-indigo-600">
                      {(healthData.uptime as { uptime_formatted: string }).uptime_formatted}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Started:{" "}
                      {new Date(
                        (healthData.uptime as { started_at: string }).started_at
                      ).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Performance Summary */}
                {healthData.performance && (
                  <div className="bg-card-bg rounded-xl border border-card-border p-6">
                    <h3 className="font-semibold mb-4">
                      Performance Overview
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        {
                          label: "Total Requests",
                          value: (healthData.performance as { total_requests: number }).total_requests,
                        },
                        {
                          label: "Avg Response",
                          value: `${(healthData.performance as { avg_response_ms?: number }).avg_response_ms ?? 0}ms`,
                        },
                        {
                          label: "Error Rate",
                          value: `${(healthData.performance as { error_rate?: number }).error_rate ?? 0}%`,
                        },
                        {
                          label: "Max Response",
                          value: `${(healthData.performance as { max_response_ms?: number }).max_response_ms ?? 0}ms`,
                        },
                      ].map((m) => (
                        <div key={m.label} className="text-center">
                          <p className="text-2xl font-bold text-gray-800">
                            {m.value}
                          </p>
                          <p className="text-xs text-gray-500">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Security Audit */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">
                Security Audit Log
              </h2>
              <button
                onClick={loadAudit}
                disabled={auditLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            <div className="bg-card-bg rounded-xl border border-card-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Action
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Risk
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditEntries
                      .slice()
                      .reverse()
                      .slice(0, 50)
                      .map((entry, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                            {entry.timestamp
                              ? new Date(
                                  entry.timestamp as string
                                ).toLocaleTimeString()
                              : "—"}
                          </td>
                          <td className="px-4 py-2 text-xs font-medium text-gray-800">
                            {entry.action as string}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                entry.risk_level === "critical"
                                  ? "bg-red-100 text-red-700"
                                  : entry.risk_level === "high"
                                    ? "bg-orange-100 text-orange-700"
                                    : entry.risk_level === "medium"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {entry.risk_level as string}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-600 max-w-xs truncate">
                            {entry.details as string}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {auditEntries.length === 0 && (
                <p className="p-8 text-center text-gray-400 text-sm">
                  No audit entries yet
                </p>
              )}
            </div>
          </div>
        )}

        {/* Performance */}
        {activeTab === "performance" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">
              Performance Metrics
            </h2>
            {perfData ? (
              <div className="bg-card-bg rounded-xl border border-card-border p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {Object.entries(
                    perfData as Record<string, unknown>
                  ).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <p className="text-2xl font-bold text-gray-800">
                        {String(value)}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {key.replace(/_/g, " ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">
                Loading performance data...
              </p>
            )}

            <div className="bg-card-bg rounded-xl border border-card-border p-6">
              <h3 className="font-semibold mb-4">Security Features Active</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    name: "Rate Limiting",
                    desc: "60 req/min default, 5/min login, 20/min generators",
                    active: true,
                  },
                  {
                    name: "XSS Protection",
                    desc: "Script/iframe/event handler detection",
                    active: true,
                  },
                  {
                    name: "SQL Injection Guard",
                    desc: "DROP/UNION/injection pattern blocking",
                    active: true,
                  },
                  {
                    name: "Path Traversal Block",
                    desc: "Directory traversal attempt prevention",
                    active: true,
                  },
                  {
                    name: "PII Scrubbing",
                    desc: "SSN, card numbers, API keys redacted from logs",
                    active: true,
                  },
                  {
                    name: "Security Headers",
                    desc: "HSTS, CSP, X-Frame-Options, XSS-Protection",
                    active: true,
                  },
                  {
                    name: "Audit Logging",
                    desc: "All requests logged with risk assessment",
                    active: true,
                  },
                  {
                    name: "Brute Force Protection",
                    desc: "5-min block after rate limit exceeded",
                    active: true,
                  },
                ].map((feature) => (
                  <div
                    key={feature.name}
                    className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {feature.name}
                      </p>
                      <p className="text-xs text-gray-500">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Backups */}
        {activeTab === "backups" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">
                Database Backups
              </h2>
              <button
                onClick={handleBackup}
                disabled={backupLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {backupLoading ? "Creating..." : "Create Backup"}
              </button>
            </div>

            <div className="bg-card-bg rounded-xl border border-card-border p-6">
              {backups.length > 0 ? (
                <div className="space-y-3">
                  {backups.map((b) => (
                    <div
                      key={b.filename}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm text-gray-800">
                          {b.filename}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(b.created).toLocaleString()} •{" "}
                          {b.size_mb} MB
                        </p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Stored
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">
                  No backups yet — click &quot;Create Backup&quot; to create
                  one
                </p>
              )}
            </div>

            <div className="bg-card-bg rounded-xl border border-card-border p-6">
              <h3 className="font-semibold mb-3">Backup Policy</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Automatic daily backups scheduled</li>
                <li>• Last 5 backups retained</li>
                <li>• Backups stored on persistent volume</li>
                <li>• Manual backup available anytime</li>
              </ul>
            </div>
          </div>
        )}

        {/* Automation Tasks */}
        {activeTab === "tasks" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">
              Automated Tasks
            </h2>

            <div className="bg-card-bg rounded-xl border border-card-border p-6">
              <h3 className="font-semibold mb-4">Scheduled Tasks</h3>
              <div className="space-y-3">
                {tasks.map((task, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-800">
                        {task.name as string}
                      </p>
                      <p className="text-xs text-gray-500">
                        {task.description as string}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded capitalize">
                        {task.schedule as string}
                      </span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        {task.status as string}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Log */}
            <div className="bg-card-bg rounded-xl border border-card-border p-6">
              <h3 className="font-semibold mb-4">Task Execution Log</h3>
              {taskLog.length > 0 ? (
                <div className="space-y-2">
                  {taskLog.map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2 text-sm"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          entry.success
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      />
                      <span className="text-xs text-gray-500">
                        {entry.timestamp
                          ? new Date(
                              entry.timestamp as string
                            ).toLocaleString()
                          : "—"}
                      </span>
                      <span className="text-gray-800">
                        {entry.task as string}
                      </span>
                      {entry.details && (
                        <span className="text-gray-500 text-xs">
                          {entry.details as string}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">
                  No task executions logged yet
                </p>
              )}
            </div>

            {/* Production Quotas */}
            <div className="bg-card-bg rounded-xl border border-card-border p-6">
              <h3 className="font-semibold mb-4">
                Master File Production Quotas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-medium text-blue-800 text-sm">
                    Daily
                  </p>
                  <ul className="text-xs text-blue-700 mt-2 space-y-1">
                    <li>• 1 cartoon</li>
                    <li>• 1 podcast</li>
                    <li>• 1 short</li>
                  </ul>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="font-medium text-purple-800 text-sm">
                    Weekly
                  </p>
                  <ul className="text-xs text-purple-700 mt-2 space-y-1">
                    <li>• 7 episodes</li>
                    <li>• Analytics review</li>
                    <li>• Audience polls</li>
                  </ul>
                </div>
                <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                  <p className="font-medium text-pink-800 text-sm">
                    Monthly
                  </p>
                  <ul className="text-xs text-pink-700 mt-2 space-y-1">
                    <li>• 3 novels</li>
                    <li>• 35 workbooks</li>
                    <li>• 15 notebooks</li>
                    <li>• 30 episodes</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
