"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import type { IncomeRecord, MoneySnapshot } from "@/lib/api";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";

export default function BusinessPage() {
  const [income, setIncome] = useState<IncomeRecord[]>([]);
  const [snapshot, setSnapshot] = useState<MoneySnapshot | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [source, setSource] = useState("pocket_fm");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.getIncome(token).then(setIncome);
    api.getMoneySnapshot(token).then(setSnapshot);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const record = await api.createIncome(token, {
      source,
      amount: parseFloat(amount),
      date: new Date(date).toISOString(),
      description: description || undefined,
    });
    setIncome([record, ...income]);
    setAmount("");
    setDate("");
    setDescription("");
    setShowForm(false);
  }

  const sourceColors: Record<string, string> = {
    pocket_fm: "bg-orange-100 text-orange-700",
    kdp: "bg-blue-100 text-blue-700",
    medium: "bg-green-100 text-green-700",
    fiverr: "bg-teal-100 text-teal-700",
  };

  return (
    <>
      <Header title="Business & Money" />
      <main className="flex-1 overflow-y-auto p-8 space-y-8">
        {snapshot && (
          <>
            <h3 className="text-lg font-semibold text-foreground">
              Money Snapshot &mdash; {snapshot.period}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard label="Total Income" value={`$${snapshot.total_income.toFixed(2)}`} color="text-success" />
              <StatCard label="Total Bills" value={`$${snapshot.total_bills.toFixed(2)}`} color="text-danger" />
              <StatCard label="Unpaid Bills" value={`$${snapshot.unpaid_bills.toFixed(2)}`} color="text-warning" />
              <StatCard label="Credit Utilization" value={`${snapshot.credit_utilization}%`} color="text-primary" />
            </div>

            {Object.keys(snapshot.income_by_source).length > 0 && (
              <div className="bg-card-bg rounded-xl border border-card-border p-6">
                <h4 className="font-semibold text-foreground mb-4">Income by Source</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(snapshot.income_by_source).map(([src, amt]) => (
                    <div key={src} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-muted capitalize">{src.replace("_", " ")}</p>
                      <p className="text-xl font-bold text-foreground">${amt.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="bg-card-bg rounded-xl border border-card-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Income Records</h3>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm transition-colors"
            >
              {showForm ? "Cancel" : "+ Add Income"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900"
                >
                  {["pocket_fm", "kdp", "medium", "fiverr"].map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ").toUpperCase()}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount"
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900"
                  required
                />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900"
                  required
                />
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900"
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition-colors">
                Add Income
              </button>
            </form>
          )}

          {income.length === 0 ? (
            <p className="text-muted text-sm">No income records yet.</p>
          ) : (
            <div className="space-y-3">
              {income.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${sourceColors[r.source] || "bg-gray-100 text-gray-700"}`}>
                      {r.source.replace("_", " ")}
                    </span>
                    <p className="text-sm text-muted">{r.description || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success">${r.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted">{new Date(r.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
