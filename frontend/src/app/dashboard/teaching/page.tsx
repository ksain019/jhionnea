"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Curriculum, Assignment } from "@/lib/api";
import Header from "@/components/Header";

export default function TeachingPage() {
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.getCurricula(token).then(setCurricula);
    api.getAssignments(token).then(setAssignments);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const curriculum = await api.createCurriculum(token, { title, subject, grade_level: gradeLevel });
    setCurricula([curriculum, ...curricula]);
    setTitle("");
    setSubject("");
    setGradeLevel("");
    setShowForm(false);
  }

  return (
    <>
      <Header title="Teaching & Curriculum" />
      <main className="flex-1 overflow-y-auto p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <p className="text-sm text-muted mb-1">Curricula</p>
            <p className="text-3xl font-bold text-primary">{curricula.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <p className="text-sm text-muted mb-1">Assignments</p>
            <p className="text-3xl font-bold text-warning">{assignments.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <p className="text-sm text-muted mb-1">Graded</p>
            <p className="text-3xl font-bold text-success">
              {assignments.filter((a) => a.status === "graded").length}
            </p>
          </div>
        </div>

        <div className="bg-card-bg rounded-xl border border-card-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">Curricula</h3>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm transition-colors"
            >
              {showForm ? "Cancel" : "+ New Curriculum"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Curriculum title"
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900"
                  required
                />
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject (e.g., ELA, Math)"
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900"
                  required
                />
                <input
                  type="text"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  placeholder="Grade level (e.g., 3rd Grade)"
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900"
                  required
                />
              </div>
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition-colors">
                Create Curriculum
              </button>
            </form>
          )}

          {curricula.length === 0 ? (
            <p className="text-muted text-sm">No curricula yet.</p>
          ) : (
            <div className="space-y-3">
              {curricula.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-foreground">{c.title}</p>
                    <p className="text-xs text-muted">{c.subject} &middot; {c.grade_level}</p>
                  </div>
                  <span className="text-xs text-muted">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card-bg rounded-xl border border-card-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Assignments</h3>
          {assignments.length === 0 ? (
            <p className="text-muted text-sm">No assignments yet.</p>
          ) : (
            <div className="space-y-3">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-foreground">{a.title}</p>
                    <p className="text-xs text-muted">
                      {a.grade ? `Grade: ${a.grade}` : "Not graded yet"}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    a.status === "graded" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
