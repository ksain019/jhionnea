"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import type { DashboardSummary } from "@/lib/api";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.getDashboard(token).then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <Header title="Dashboard" />
      <main className="flex-1 overflow-y-auto p-8">
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-6 border border-red-200">
            {error}
          </div>
        )}

        {data ? (
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-foreground">{data.greeting}</h3>
              <p className="text-muted mt-1">
                Here&apos;s your overview for today
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                label="Active Projects"
                value={data.writing.active_projects}
                sub={`${data.writing.total_projects} total`}
              />
              <StatCard
                label="Completed This Week"
                value={data.writing.completed_this_week}
                color="text-success"
              />
              <StatCard
                label="Upcoming Events"
                value={data.calendar.upcoming_count}
                sub="Next 7 days"
                color="text-warning"
              />
              <StatCard
                label="Weekly Income"
                value={`$${data.finances.weekly_income.toFixed(2)}`}
                color="text-success"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card-bg rounded-xl border border-card-border p-6">
                <h4 className="font-semibold text-foreground mb-4">Upcoming Events</h4>
                {data.calendar.events.length === 0 ? (
                  <p className="text-muted text-sm">No upcoming events</p>
                ) : (
                  <ul className="space-y-3">
                    {data.calendar.events.map((event) => (
                      <li key={event.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{event.title}</p>
                          <p className="text-xs text-muted capitalize">{event.type}</p>
                        </div>
                        <span className="text-xs text-muted">
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-card-bg rounded-xl border border-card-border p-6">
                <h4 className="font-semibold text-foreground mb-4">Upcoming Bills</h4>
                {data.finances.upcoming_bills.length === 0 ? (
                  <p className="text-muted text-sm">No upcoming bills</p>
                ) : (
                  <ul className="space-y-3">
                    {data.finances.upcoming_bills.map((bill) => (
                      <li key={bill.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <p className="text-sm font-medium text-foreground">{bill.name}</p>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-danger">${bill.amount.toFixed(2)}</p>
                          <p className="text-xs text-muted">
                            Due {new Date(bill.due_date).toLocaleDateString()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : !error ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted">Loading dashboard...</div>
          </div>
        ) : null}
      </main>
    </>
  );
}
