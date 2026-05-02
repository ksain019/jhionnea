"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Curriculum, Assignment, Student, AttendanceRecord, DemoLesson, StudentAnalysis } from "@/lib/api";
import Header from "@/components/Header";
import { useSidebar } from "../layout";

type Tab = "overview" | "students" | "assignments" | "attendance" | "demo-lessons";

export default function TeachingPage() {
  const { toggleSidebar } = useSidebar();
  const [tab, setTab] = useState<Tab>("overview");
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [demoLessons, setDemoLessons] = useState<DemoLesson[]>([]);
  const [analysis, setAnalysis] = useState<StudentAnalysis | null>(null);

  // Forms
  const [showCurriculumForm, setShowCurriculumForm] = useState(false);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [showDemoForm, setShowDemoForm] = useState(false);
  const [gradingId, setGradingId] = useState<number | null>(null);

  // Curriculum form
  const [curTitle, setCurTitle] = useState("");
  const [curSubject, setCurSubject] = useState("");
  const [curGrade, setCurGrade] = useState("");

  // Student form
  const [stuName, setStuName] = useState("");
  const [stuEmail, setStuEmail] = useState("");
  const [stuGrade, setStuGrade] = useState("");

  // Assignment form
  const [asnTitle, setAsnTitle] = useState("");
  const [asnStudentId, setAsnStudentId] = useState("");
  const [asnContent, setAsnContent] = useState("");

  // Grading form
  const [gradeVal, setGradeVal] = useState("");
  const [scoreVal, setScoreVal] = useState("");
  const [feedbackVal, setFeedbackVal] = useState("");

  // Attendance form
  const [attStudentId, setAttStudentId] = useState("");
  const [attDate, setAttDate] = useState(new Date().toISOString().split("T")[0]);
  const [attStatus, setAttStatus] = useState("present");

  // Demo lesson form
  const [demoTitle, setDemoTitle] = useState("");
  const [demoSubject, setDemoSubject] = useState("");
  const [demoGrade, setDemoGrade] = useState("");
  const [demoDuration, setDemoDuration] = useState("45");

  // File upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Expanded demo lesson
  const [expandedLesson, setExpandedLesson] = useState<DemoLesson | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.getCurricula(token).then(setCurricula);
    api.getAssignments(token).then(setAssignments);
    api.getStudents(token).then(setStudents);
    api.getAttendance(token).then(setAttendance);
    api.getDemoLessons(token).then(setDemoLessons);
  }, []);

  async function handleCreateCurriculum(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const c = await api.createCurriculum(token, { title: curTitle, subject: curSubject, grade_level: curGrade });
    setCurricula([c, ...curricula]);
    setCurTitle(""); setCurSubject(""); setCurGrade("");
    setShowCurriculumForm(false);
  }

  async function handleCreateStudent(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const s = await api.createStudent(token, { name: stuName, email: stuEmail || undefined, grade_level: stuGrade || undefined });
    setStudents([...students, s]);
    setStuName(""); setStuEmail(""); setStuGrade("");
    setShowStudentForm(false);
  }

  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const a = await api.createAssignment(token, {
      title: asnTitle,
      student_id: asnStudentId ? Number(asnStudentId) : undefined,
      content: asnContent || undefined,
    });
    setAssignments([a, ...assignments]);
    setAsnTitle(""); setAsnStudentId(""); setAsnContent("");
    setShowAssignmentForm(false);
  }

  async function handleGrade(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token || !gradingId) return;
    const updated = await api.gradeAssignment(token, gradingId, {
      grade: gradeVal,
      score: scoreVal ? Number(scoreVal) : undefined,
      feedback: feedbackVal,
    });
    setAssignments(assignments.map((a) => (a.id === gradingId ? updated : a)));
    setGradingId(null);
    setGradeVal(""); setScoreVal(""); setFeedbackVal("");
  }

  async function handleRecordAttendance(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const record = await api.recordAttendance(token, {
      student_id: Number(attStudentId),
      date: attDate,
      status: attStatus,
    });
    setAttendance([record, ...attendance]);
    setAttStudentId(""); setAttStatus("present");
    setShowAttendanceForm(false);
  }

  async function handleCreateDemoLesson(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const lesson = await api.createDemoLesson(token, {
      title: demoTitle,
      subject: demoSubject,
      grade_level: demoGrade,
      duration_minutes: Number(demoDuration),
    });
    setDemoLessons([lesson, ...demoLessons]);
    setDemoTitle(""); setDemoSubject(""); setDemoGrade(""); setDemoDuration("45");
    setShowDemoForm(false);
  }

  async function handleAnalyzeStudent(studentId: number) {
    const token = getToken();
    if (!token) return;
    const result = await api.getStudentAnalysis(token, studentId);
    setAnalysis(result);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "students", label: "Students" },
    { key: "assignments", label: "Grading" },
    { key: "attendance", label: "Attendance" },
    { key: "demo-lessons", label: "Sick Day Lessons" },
  ];

  const inputCls = "px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900";
  const btnPrimary = "px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition-colors";
  const btnSecondary = "px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors";

  return (
    <>
      <Header title="Teaching & Curriculum" onMenuToggle={toggleSidebar} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-card-bg rounded-xl border border-card-border p-4">
            <p className="text-xs text-muted mb-1">Curricula</p>
            <p className="text-2xl font-bold text-primary">{curricula.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-4">
            <p className="text-xs text-muted mb-1">Students</p>
            <p className="text-2xl font-bold text-blue-600">{students.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-4">
            <p className="text-xs text-muted mb-1">Assignments</p>
            <p className="text-2xl font-bold text-warning">{assignments.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-4">
            <p className="text-xs text-muted mb-1">Graded</p>
            <p className="text-2xl font-bold text-success">{assignments.filter((a) => a.status === "graded").length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-4">
            <p className="text-xs text-muted mb-1">Demo Lessons</p>
            <p className="text-2xl font-bold text-purple-600">{demoLessons.length}</p>
          </div>
        </div>

        {/* Tab Content */}
        {tab === "overview" && (
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Curricula</h3>
              <button onClick={() => setShowCurriculumForm(!showCurriculumForm)} className={btnPrimary}>
                {showCurriculumForm ? "Cancel" : "+ New Curriculum"}
              </button>
            </div>
            {showCurriculumForm && (
              <form onSubmit={handleCreateCurriculum} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" value={curTitle} onChange={(e) => setCurTitle(e.target.value)} placeholder="Title" className={inputCls} required />
                  <input type="text" value={curSubject} onChange={(e) => setCurSubject(e.target.value)} placeholder="Subject (ELA, Math)" className={inputCls} required />
                  <input type="text" value={curGrade} onChange={(e) => setCurGrade(e.target.value)} placeholder="Grade level" className={inputCls} required />
                </div>
                <button type="submit" className={btnPrimary}>Create</button>
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
        )}

        {tab === "students" && (
          <div className="space-y-6">
            <div className="bg-card-bg rounded-xl border border-card-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">Students</h3>
                <button onClick={() => setShowStudentForm(!showStudentForm)} className={btnPrimary}>
                  {showStudentForm ? "Cancel" : "+ Add Student"}
                </button>
              </div>
              {showStudentForm && (
                <form onSubmit={handleCreateStudent} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" value={stuName} onChange={(e) => setStuName(e.target.value)} placeholder="Student name" className={inputCls} required />
                    <input type="email" value={stuEmail} onChange={(e) => setStuEmail(e.target.value)} placeholder="Email (optional)" className={inputCls} />
                    <input type="text" value={stuGrade} onChange={(e) => setStuGrade(e.target.value)} placeholder="Grade level" className={inputCls} />
                  </div>
                  <button type="submit" className={btnPrimary}>Add Student</button>
                </form>
              )}
              {students.length === 0 ? (
                <p className="text-muted text-sm">No students added yet.</p>
              ) : (
                <div className="space-y-3">
                  {students.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="font-medium text-foreground">{s.name}</p>
                        <p className="text-xs text-muted">{s.email || "No email"} &middot; {s.grade_level || "No grade"}</p>
                      </div>
                      <button onClick={() => handleAnalyzeStudent(s.id)} className="text-xs text-primary hover:underline">
                        Analyze
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {analysis && (
              <div className="bg-card-bg rounded-xl border border-card-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Analysis: {analysis.student_name}</h3>
                  <button onClick={() => setAnalysis(null)} className={btnSecondary}>Close</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-muted">Total Assignments</p>
                    <p className="text-xl font-bold">{analysis.total_assignments}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-muted">Graded</p>
                    <p className="text-xl font-bold">{analysis.graded_assignments}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-muted">Avg Score</p>
                    <p className="text-xl font-bold">{analysis.average_score ? `${analysis.average_score.toFixed(1)}%` : "N/A"}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-muted">Attendance</p>
                    <p className="text-xl font-bold">{analysis.attendance_rate ? `${analysis.attendance_rate.toFixed(0)}%` : "N/A"}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm"><strong className="text-green-600">Strengths:</strong> {analysis.strengths}</p>
                  <p className="text-sm"><strong className="text-orange-600">Areas for Improvement:</strong> {analysis.areas_for_improvement}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "assignments" && (
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Assignments & Grading</h3>
              <button onClick={() => setShowAssignmentForm(!showAssignmentForm)} className={btnPrimary}>
                {showAssignmentForm ? "Cancel" : "+ New Assignment"}
              </button>
            </div>
            {showAssignmentForm && (
              <form onSubmit={handleCreateAssignment} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" value={asnTitle} onChange={(e) => setAsnTitle(e.target.value)} placeholder="Assignment title" className={inputCls} required={!uploadFile} />
                  <select value={asnStudentId} onChange={(e) => setAsnStudentId(e.target.value)} className={inputCls}>
                    <option value="">Select student (optional)</option>
                    {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {/* File Upload Zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) setUploadFile(file);
                  }}
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    dragOver ? "border-primary bg-indigo-50" : uploadFile ? "border-green-400 bg-green-50" : "border-gray-300"
                  }`}
                >
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-green-700 font-medium">{uploadFile.name}</span>
                      <button type="button" onClick={() => setUploadFile(null)} className="text-xs text-red-500 hover:text-red-700 ml-2">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="space-y-1">
                        <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <p className="text-sm text-gray-600">Drop a file here or <span className="text-primary font-medium">browse</span></p>
                        <p className="text-xs text-muted">PDF, DOCX, or TXT</p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={(e) => { if (e.target.files?.[0]) setUploadFile(e.target.files[0]); }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {!uploadFile && (
                  <textarea value={asnContent} onChange={(e) => setAsnContent(e.target.value)} placeholder="Or type/paste assignment content here..." className={`${inputCls} w-full`} rows={3} />
                )}

                <div className="flex gap-2">
                  {uploadFile ? (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={async () => {
                        const token = getToken();
                        if (!token || !uploadFile) return;
                        setUploading(true);
                        try {
                          const a = await api.uploadAssignment(
                            token,
                            uploadFile,
                            asnTitle || undefined,
                            asnStudentId ? Number(asnStudentId) : undefined,
                          );
                          setAssignments([a, ...assignments]);
                          setUploadFile(null);
                          setAsnTitle(""); setAsnStudentId("");
                          setShowAssignmentForm(false);
                        } catch (err) {
                          console.error("Upload failed:", err);
                        } finally {
                          setUploading(false);
                        }
                      }}
                      className={btnPrimary}
                    >
                      {uploading ? "Uploading..." : "Upload & Create"}
                    </button>
                  ) : (
                    <button type="submit" className={btnPrimary}>Create Assignment</button>
                  )}
                </div>
              </form>
            )}

            {gradingId && (
              <form onSubmit={handleGrade} className="mb-6 p-4 bg-blue-50 rounded-lg space-y-4 border border-blue-200">
                <h4 className="font-medium text-foreground">Grade Assignment #{gradingId}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" value={gradeVal} onChange={(e) => setGradeVal(e.target.value)} placeholder="Grade (A, B+, etc.)" className={inputCls} required />
                  <input type="number" value={scoreVal} onChange={(e) => setScoreVal(e.target.value)} placeholder="Score (0-100)" className={inputCls} />
                </div>
                <textarea value={feedbackVal} onChange={(e) => setFeedbackVal(e.target.value)} placeholder="Feedback for the student..." className={`${inputCls} w-full`} rows={3} required />
                <div className="flex gap-2">
                  <button type="submit" className={btnPrimary}>Submit Grade</button>
                  <button type="button" onClick={() => setGradingId(null)} className={btnSecondary}>Cancel</button>
                </div>
              </form>
            )}

            {assignments.length === 0 ? (
              <p className="text-muted text-sm">No assignments yet.</p>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-foreground">{a.title}</p>
                      <p className="text-xs text-muted">
                        {a.student_id ? `Student #${a.student_id}` : "Unassigned"}
                        {a.file_name && (
                          <span className="ml-2 inline-flex items-center gap-1 text-indigo-600">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            {a.file_name}
                          </span>
                        )}
                        {a.grade && <span className="ml-2 text-green-600 font-medium">Grade: {a.grade}</span>}
                        {a.score != null && <span className="ml-2 text-blue-600">({a.score}%)</span>}
                      </p>
                      {a.feedback && <p className="text-xs text-gray-500 mt-1 italic">{a.feedback}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        a.status === "graded" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {a.status}
                      </span>
                      {a.status !== "graded" && (
                        <button onClick={() => setGradingId(a.id)} className="text-xs text-primary hover:underline">
                          Grade
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "attendance" && (
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Attendance Tracker</h3>
              <button onClick={() => setShowAttendanceForm(!showAttendanceForm)} className={btnPrimary}>
                {showAttendanceForm ? "Cancel" : "+ Record Attendance"}
              </button>
            </div>
            {showAttendanceForm && (
              <form onSubmit={handleRecordAttendance} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select value={attStudentId} onChange={(e) => setAttStudentId(e.target.value)} className={inputCls} required>
                    <option value="">Select student</option>
                    {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} className={inputCls} required />
                  <select value={attStatus} onChange={(e) => setAttStatus(e.target.value)} className={inputCls}>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="excused">Excused</option>
                  </select>
                </div>
                <button type="submit" className={btnPrimary}>Record</button>
              </form>
            )}

            {attendance.length === 0 ? (
              <p className="text-muted text-sm">No attendance records yet.</p>
            ) : (
              <div className="space-y-3">
                {attendance.map((r) => {
                  const student = students.find((s) => s.id === r.student_id);
                  const statusColors: Record<string, string> = {
                    present: "bg-green-100 text-green-700",
                    absent: "bg-red-100 text-red-700",
                    late: "bg-yellow-100 text-yellow-700",
                    excused: "bg-blue-100 text-blue-700",
                  };
                  return (
                    <div key={r.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="font-medium text-foreground">{student?.name || `Student #${r.student_id}`}</p>
                        <p className="text-xs text-muted">{r.date}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[r.status] || "bg-gray-100 text-gray-700"}`}>
                        {r.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "demo-lessons" && (
          <div className="space-y-6">
            <div className="bg-card-bg rounded-xl border border-card-border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Sick Day / Demo Lessons</h3>
                  <p className="text-sm text-muted mt-1">Auto-generate complete lesson plans for when you are out</p>
                </div>
                <button onClick={() => setShowDemoForm(!showDemoForm)} className={btnPrimary}>
                  {showDemoForm ? "Cancel" : "+ Create Demo Lesson"}
                </button>
              </div>
              {showDemoForm && (
                <form onSubmit={handleCreateDemoLesson} className="mb-6 p-4 bg-purple-50 rounded-lg space-y-4 border border-purple-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={demoTitle} onChange={(e) => setDemoTitle(e.target.value)} placeholder="Lesson title" className={inputCls} required />
                    <input type="text" value={demoSubject} onChange={(e) => setDemoSubject(e.target.value)} placeholder="Subject (ELA, Math, Science)" className={inputCls} required />
                    <input type="text" value={demoGrade} onChange={(e) => setDemoGrade(e.target.value)} placeholder="Grade level (3rd Grade)" className={inputCls} required />
                    <input type="number" value={demoDuration} onChange={(e) => setDemoDuration(e.target.value)} placeholder="Duration (minutes)" className={inputCls} />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors">
                    Generate Lesson Plan
                  </button>
                </form>
              )}

              {demoLessons.length === 0 ? (
                <p className="text-muted text-sm">No demo lessons created yet. Create one for when you are sick!</p>
              ) : (
                <div className="space-y-3">
                  {demoLessons.map((lesson) => (
                    <div key={lesson.id} className="py-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{lesson.title}</p>
                          <p className="text-xs text-muted">{lesson.subject} &middot; {lesson.grade_level} &middot; {lesson.duration_minutes} min</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            lesson.status === "ready" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {lesson.status}
                          </span>
                          <button
                            onClick={() => setExpandedLesson(expandedLesson?.id === lesson.id ? null : lesson)}
                            className="text-xs text-primary hover:underline"
                          >
                            {expandedLesson?.id === lesson.id ? "Collapse" : "View Plan"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {expandedLesson && (
              <div className="bg-card-bg rounded-xl border border-card-border p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">{expandedLesson.title}</h3>
                  <button onClick={() => setExpandedLesson(null)} className={btnSecondary}>Close</button>
                </div>
                {expandedLesson.lesson_plan && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Lesson Plan</h4>
                    <pre className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">{expandedLesson.lesson_plan}</pre>
                  </div>
                )}
                {expandedLesson.student_instructions && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Student Instructions</h4>
                    <pre className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">{expandedLesson.student_instructions}</pre>
                  </div>
                )}
                {expandedLesson.materials && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Materials</h4>
                    <pre className="bg-green-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">{expandedLesson.materials}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
