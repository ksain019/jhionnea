"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import type { EmailRule, EmailLog } from "@/lib/api";
import Header from "@/components/Header";

type Tab = "rules" | "analyze" | "logs";

interface AnalysisResult {
  from: string;
  subject: string;
  action: string;
  reason: string;
}

export default function EmailPage() {
  const [tab, setTab] = useState<Tab>("rules");
  const [rules, setRules] = useState<EmailRule[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);

  // Rule form
  const [ruleName, setRuleName] = useState("");
  const [ruleType, setRuleType] = useState("delete");
  const [ruleField, setRuleField] = useState("from");
  const [ruleValue, setRuleValue] = useState("");

  // Analyze form
  const [analyzeInput, setAnalyzeInput] = useState("");

  const inputCls = "px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900";
  const btnPrimary = "px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition-colors";

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.getEmailRules(token).then(setRules);
    api.getEmailLogs(token).then(setLogs);
  }, []);

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const rule = await api.createEmailRule(token, {
      name: ruleName,
      rule_type: ruleType,
      condition_field: ruleField,
      condition_value: ruleValue,
    });
    setRules([rule, ...rules]);
    setRuleName(""); setRuleValue("");
    setShowRuleForm(false);
  }

  async function handleDeleteRule(ruleId: number) {
    const token = getToken();
    if (!token) return;
    await api.deleteEmailRule(token, ruleId);
    setRules(rules.filter((r) => r.id !== ruleId));
  }

  async function handleToggleRule(ruleId: number) {
    const token = getToken();
    if (!token) return;
    const updated = await api.toggleEmailRule(token, ruleId);
    setRules(rules.map((r) => (r.id === ruleId ? updated : r)));
  }

  async function handleAnalyze() {
    const token = getToken();
    if (!token || !analyzeInput.trim()) return;

    const lines = analyzeInput.trim().split("\n").filter((l) => l.trim());
    const emails = lines.map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        from: parts[0] || "unknown@email.com",
        subject: parts[1] || "No subject",
        body: parts[2] || "",
      };
    });

    const result = await api.analyzeEmails(token, emails);
    setAnalysisResults(result.results);
    // Refresh logs
    api.getEmailLogs(token).then(setLogs);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "rules", label: "Rules" },
    { key: "analyze", label: "Analyze Emails" },
    { key: "logs", label: "History" },
  ];

  const actionColors: Record<string, string> = {
    keep: "bg-green-100 text-green-700",
    delete: "bg-red-100 text-red-700",
    archive: "bg-blue-100 text-blue-700",
    label: "bg-purple-100 text-purple-700",
    kept: "bg-green-100 text-green-700",
    deleted: "bg-red-100 text-red-700",
    archived: "bg-blue-100 text-blue-700",
  };

  return (
    <>
      <Header title="Email Management" />
      <main className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? "bg-white text-primary shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card-bg rounded-xl border border-card-border p-4">
            <p className="text-xs text-muted mb-1">Active Rules</p>
            <p className="text-2xl font-bold text-primary">{rules.filter((r) => r.is_active).length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-4">
            <p className="text-xs text-muted mb-1">Emails Processed</p>
            <p className="text-2xl font-bold text-blue-600">{logs.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-4">
            <p className="text-xs text-muted mb-1">Auto-Deleted</p>
            <p className="text-2xl font-bold text-red-600">{logs.filter((l) => l.action_taken === "deleted" || l.action_taken === "delete").length}</p>
          </div>
        </div>

        {/* Rules Tab */}
        {tab === "rules" && (
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Email Rules</h3>
                <p className="text-sm text-muted mt-1">Define rules to auto-sort your Gmail — keep important, delete junk</p>
              </div>
              <button onClick={() => setShowRuleForm(!showRuleForm)} className={btnPrimary}>
                {showRuleForm ? "Cancel" : "+ New Rule"}
              </button>
            </div>

            {showRuleForm && (
              <form onSubmit={handleCreateRule} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="Rule name (e.g., Delete newsletters)" className={inputCls} required />
                  <select value={ruleType} onChange={(e) => setRuleType(e.target.value)} className={inputCls}>
                    <option value="delete">Delete</option>
                    <option value="keep">Keep</option>
                    <option value="archive">Archive</option>
                    <option value="label">Label</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select value={ruleField} onChange={(e) => setRuleField(e.target.value)} className={inputCls}>
                    <option value="from">From (sender)</option>
                    <option value="subject">Subject</option>
                    <option value="body">Body</option>
                    <option value="label">Label</option>
                  </select>
                  <input type="text" value={ruleValue} onChange={(e) => setRuleValue(e.target.value)} placeholder="Contains... (e.g., newsletter@)" className={inputCls} required />
                </div>
                <button type="submit" className={btnPrimary}>Create Rule</button>
              </form>
            )}

            {rules.length === 0 ? (
              <p className="text-muted text-sm">No rules yet. Create rules to auto-manage your email!</p>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className={`font-medium ${rule.is_active ? "text-foreground" : "text-gray-400 line-through"}`}>{rule.name}</p>
                      <p className="text-xs text-muted">
                        If <strong>{rule.condition_field}</strong> contains &quot;{rule.condition_value}&quot; → <strong>{rule.rule_type}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionColors[rule.rule_type] || "bg-gray-100 text-gray-700"}`}>
                        {rule.rule_type}
                      </span>
                      <button onClick={() => handleToggleRule(rule.id)} className="text-xs text-blue-600 hover:underline">
                        {rule.is_active ? "Disable" : "Enable"}
                      </button>
                      <button onClick={() => handleDeleteRule(rule.id)} className="text-xs text-red-600 hover:underline">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analyze Tab */}
        {tab === "analyze" && (
          <div className="space-y-6">
            <div className="bg-card-bg rounded-xl border border-card-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">Analyze Emails</h3>
              <p className="text-sm text-muted mb-4">
                Paste email info below (one per line, format: <code className="bg-gray-100 px-1 rounded">from | subject | body</code>). Jhionnea will classify each as keep or delete.
              </p>
              <textarea
                value={analyzeInput}
                onChange={(e) => setAnalyzeInput(e.target.value)}
                placeholder={"newsletter@shop.com | 50% OFF SALE! | Limited time offer...\nteacher@school.edu | Grade Report | Your child's grades...\nno-reply@spam.com | You Won $1M! | Click here to claim..."}
                className={`${inputCls} w-full`}
                rows={6}
              />
              <button onClick={handleAnalyze} className={`${btnPrimary} mt-4`}>
                Analyze Emails
              </button>
            </div>

            {analysisResults.length > 0 && (
              <div className="bg-card-bg rounded-xl border border-card-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Results</h3>
                <div className="space-y-3">
                  {analysisResults.map((r, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="font-medium text-foreground">{r.subject}</p>
                        <p className="text-xs text-muted">From: {r.from}</p>
                        <p className="text-xs text-gray-500 mt-1">{r.reason}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${actionColors[r.action] || "bg-gray-100 text-gray-700"}`}>
                        {r.action.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {tab === "logs" && (
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Email Processing History</h3>
            {logs.length === 0 ? (
              <p className="text-muted text-sm">No emails processed yet. Use the Analyze tab to start!</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-foreground">{log.email_subject}</p>
                      <p className="text-xs text-muted">From: {log.email_from}</p>
                      {log.reason && <p className="text-xs text-gray-500 mt-1">{log.reason}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionColors[log.action_taken] || "bg-gray-100 text-gray-700"}`}>
                        {log.action_taken}
                      </span>
                      <span className="text-xs text-muted">{new Date(log.processed_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
