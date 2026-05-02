"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import type { WritingProject, WritingStats } from "@/lib/api";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";

const PROJECT_TYPES = ["novel", "workbook", "episode", "script"];
const PLATFORMS = ["KDP", "Pocket FM", "YouTube", "Medium"];

export default function WritingPage() {
  const [projects, setProjects] = useState<WritingProject[]>([]);
  const [stats, setStats] = useState<WritingStats | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [projectType, setProjectType] = useState("novel");
  const [platform, setPlatform] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.getWritingProjects(token).then(setProjects);
    api.getWritingStats(token).then(setStats);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const project = await api.createWritingProject(token, {
      title,
      project_type: projectType,
      target_platform: platform || undefined,
    });
    setProjects([project, ...projects]);
    setTitle("");
    setShowForm(false);
    if (stats) {
      setStats({ ...stats, total_projects: stats.total_projects + 1 });
    }
  }

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    published: "bg-purple-100 text-purple-700",
  };

  return (
    <>
      <Header title="Writing & Publishing" />
      <main className="flex-1 overflow-y-auto p-8">
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard label="Total Projects" value={stats.total_projects} />
            <StatCard label="Total Words" value={stats.total_word_count.toLocaleString()} color="text-primary" />
            <StatCard
              label="By Type"
              value={Object.entries(stats.by_type).map(([k, v]) => `${k}: ${v}`).join(", ") || "None"}
              color="text-muted"
            />
          </div>
        )}

        <div className="bg-card-bg rounded-xl border border-card-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Projects</h3>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm transition-colors"
            >
              {showForm ? "Cancel" : "+ New Project"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Project title"
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900"
                  required
                />
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900"
                >
                  {PROJECT_TYPES.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900"
                >
                  <option value="">Platform (optional)</option>
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition-colors">
                Create Project
              </button>
            </form>
          )}

          {projects.length === 0 ? (
            <p className="text-muted text-sm">No writing projects yet. Create your first one!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b border-gray-200">
                    <th className="pb-3 font-medium">Title</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Platform</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Words</th>
                    <th className="pb-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 font-medium text-foreground">{p.title}</td>
                      <td className="py-3 capitalize text-muted">{p.project_type}</td>
                      <td className="py-3 text-muted">{p.target_platform || "—"}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[p.status] || "bg-gray-100 text-gray-700"}`}>
                          {p.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 text-muted">{p.word_count.toLocaleString()}</td>
                      <td className="py-3 text-muted">{new Date(p.updated_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
