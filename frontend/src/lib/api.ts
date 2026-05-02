const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((customHeaders as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { headers, ...rest });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `API error ${res.status}`);
  }

  return res.json();
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
  full_name: string;
}

export interface DashboardSummary {
  greeting: string;
  role: string;
  writing: {
    active_projects: number;
    completed_this_week: number;
    total_projects: number;
  };
  calendar: {
    upcoming_count: number;
    events: Array<{
      id: number;
      title: string;
      type: string;
      date: string;
    }>;
  };
  finances: {
    weekly_income: number;
    upcoming_bills: Array<{
      id: number;
      name: string;
      amount: number;
      due_date: string;
    }>;
  };
  timestamp: string;
}

export interface WritingProject {
  id: number;
  title: string;
  project_type: string;
  status: string;
  word_count: number;
  target_platform: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface WritingStats {
  total_projects: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  total_word_count: number;
}

export interface Curriculum {
  id: number;
  title: string;
  subject: string;
  grade_level: string;
  created_by: number;
  created_at: string;
}

export interface Assignment {
  id: number;
  curriculum_id: number | null;
  student_id: number | null;
  title: string;
  content: string | null;
  file_name: string | null;
  feedback: string | null;
  grade: string | null;
  score: number | null;
  status: string;
  created_at: string;
}

export interface Student {
  id: number;
  name: string;
  email: string | null;
  grade_level: string | null;
  notes: string | null;
  created_by: number;
  created_at: string;
}

export interface AttendanceRecord {
  id: number;
  student_id: number;
  curriculum_id: number | null;
  date: string;
  status: string;
  notes: string | null;
  recorded_by: number;
  created_at: string;
}

export interface DemoLesson {
  id: number;
  curriculum_id: number | null;
  title: string;
  subject: string;
  grade_level: string;
  duration_minutes: number;
  lesson_plan: string | null;
  student_instructions: string | null;
  materials: string | null;
  status: string;
  created_by: number;
  created_at: string;
}

export interface StudentAnalysis {
  student_id: number;
  student_name: string;
  total_assignments: number;
  graded_assignments: number;
  average_score: number | null;
  grades: string[];
  attendance_rate: number | null;
  strengths: string;
  areas_for_improvement: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  event_type: string;
  platform: string | null;
  scheduled_date: string;
  status: string;
  notes: string | null;
  created_by: number;
  created_at: string;
}

export interface ContentDraft {
  id: number;
  title: string;
  platform: string;
  status: string;
  created_by: number;
  created_at: string;
}

export interface YouTubeProject {
  id: number;
  title: string;
  project_type: string;
  topic: string | null;
  target_age: string | null;
  duration_minutes: number;
  script: string | null;
  storyboard: string | null;
  status: string;
  season: number | null;
  episode_number: number | null;
  channel_name: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface PodcastEpisode {
  id: number;
  title: string;
  show_name: string | null;
  topic: string | null;
  script: string | null;
  notes: string | null;
  duration_minutes: number;
  voice_style: string;
  status: string;
  episode_number: number | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentProject {
  id: number;
  title: string;
  doc_type: string;
  format_style: string;
  content: string | null;
  formatted_content: string | null;
  word_count: number;
  page_count: number;
  status: string;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface EmailRule {
  id: number;
  name: string;
  rule_type: string;
  condition_field: string;
  condition_value: string;
  is_active: boolean;
  created_by: number;
  created_at: string;
}

export interface EmailLog {
  id: number;
  email_from: string;
  email_subject: string;
  action_taken: string;
  rule_id: number | null;
  reason: string | null;
  processed_at: string;
  created_by: number;
}

export interface IncomeRecord {
  id: number;
  source: string;
  amount: number;
  description: string | null;
  date: string;
  created_by: number;
  created_at: string;
}

export interface MoneySnapshot {
  total_income: number;
  income_by_source: Record<string, number>;
  total_bills: number;
  unpaid_bills: number;
  credit_utilization: number;
  period: string;
}

export interface WatchlistItem {
  id: number;
  symbol: string;
  name: string;
  asset_type: string;
  notes: string | null;
  created_by: number;
  created_at: string;
}

export interface TradeLogEntry {
  id: number;
  symbol: string;
  action: string;
  quantity: number;
  price: number;
  date: string;
  notes: string | null;
  created_by: number;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  role: string;
  content: string;
  user_id: number;
  created_at: string;
}

export interface ChatReply {
  user_message: ChatMessage;
  assistant_message: ChatMessage;
  browser_screenshot?: string | null;
  browser_url?: string | null;
}

export interface BrowserActionRequest {
  action: string;
  url?: string;
  selector?: string;
  text?: string;
  query?: string;
  direction?: string;
}

export interface BrowserActionResponse {
  success: boolean;
  action: string;
  url: string;
  title: string;
  screenshot_b64: string;
  text_content: string;
  error: string;
}

export const api = {
  login(username: string, password: string) {
    return apiFetch<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  getMe(token: string) {
    return apiFetch<{ id: number; username: string; full_name: string; role: string }>(
      "/api/auth/me",
      { token }
    );
  },

  getDashboard(token: string) {
    return apiFetch<DashboardSummary>("/api/dashboard/summary", { token });
  },

  // Writing
  getWritingProjects(token: string) {
    return apiFetch<WritingProject[]>("/api/writing/projects", { token });
  },
  createWritingProject(token: string, data: { title: string; project_type: string; target_platform?: string }) {
    return apiFetch<WritingProject>("/api/writing/projects", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  },
  getWritingStats(token: string) {
    return apiFetch<WritingStats>("/api/writing/stats", { token });
  },

  // Teaching - Curricula
  getCurricula(token: string) {
    return apiFetch<Curriculum[]>("/api/teaching/curricula", { token });
  },
  createCurriculum(token: string, data: { title: string; subject: string; grade_level: string }) {
    return apiFetch<Curriculum>("/api/teaching/curricula", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  },

  // Teaching - Students
  getStudents(token: string) {
    return apiFetch<Student[]>("/api/teaching/students", { token });
  },
  createStudent(token: string, data: { name: string; email?: string; grade_level?: string; notes?: string }) {
    return apiFetch<Student>("/api/teaching/students", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  },

  // Teaching - Assignments & Grading
  getAssignments(token: string) {
    return apiFetch<Assignment[]>("/api/teaching/assignments", { token });
  },
  createAssignment(token: string, data: { title: string; student_id?: number; curriculum_id?: number; content?: string }) {
    return apiFetch<Assignment>("/api/teaching/assignments", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  },
  uploadAssignment(token: string, file: File, title?: string, studentId?: number) {
    const formData = new FormData();
    formData.append("file", file);
    if (title) formData.append("title", title);
    if (studentId) formData.append("student_id", String(studentId));
    return fetch(`${API_BASE}/api/teaching/assignments/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail || `API error ${res.status}`);
      }
      return res.json() as Promise<Assignment>;
    });
  },

  gradeAssignment(token: string, assignmentId: number, data: { grade: string; score?: number; feedback: string }) {
    return apiFetch<Assignment>(`/api/teaching/assignments/${assignmentId}/grade`, {
      method: "PUT",
      token,
      body: JSON.stringify(data),
    });
  },

  // Teaching - Attendance
  getAttendance(token: string, date?: string, studentId?: number) {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (studentId) params.set("student_id", String(studentId));
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiFetch<AttendanceRecord[]>(`/api/teaching/attendance${query}`, { token });
  },
  recordAttendance(token: string, data: { student_id: number; date: string; status: string; curriculum_id?: number; notes?: string }) {
    return apiFetch<AttendanceRecord>("/api/teaching/attendance", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  },
  recordBulkAttendance(token: string, records: Array<{ student_id: number; date: string; status: string; curriculum_id?: number; notes?: string }>) {
    return apiFetch<AttendanceRecord[]>("/api/teaching/attendance/bulk", {
      method: "POST",
      token,
      body: JSON.stringify(records),
    });
  },

  // Teaching - Demo Lessons
  getDemoLessons(token: string) {
    return apiFetch<DemoLesson[]>("/api/teaching/demo-lessons", { token });
  },
  createDemoLesson(token: string, data: { title: string; subject: string; grade_level: string; duration_minutes?: number; curriculum_id?: number }) {
    return apiFetch<DemoLesson>("/api/teaching/demo-lessons", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  },
  getDemoLesson(token: string, id: number) {
    return apiFetch<DemoLesson>(`/api/teaching/demo-lessons/${id}`, { token });
  },

  // Teaching - Student Analysis
  getStudentAnalysis(token: string, studentId: number) {
    return apiFetch<StudentAnalysis>(`/api/teaching/students/${studentId}/analysis`, { token });
  },

  // Content - Calendar
  getCalendarEvents(token: string) {
    return apiFetch<CalendarEvent[]>("/api/content/calendar", { token });
  },
  createCalendarEvent(token: string, data: { title: string; event_type: string; scheduled_date: string }) {
    return apiFetch<CalendarEvent>("/api/content/calendar", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  },
  getContentDrafts(token: string, platform?: string) {
    const query = platform ? `?platform=${platform}` : "";
    return apiFetch<ContentDraft[]>(`/api/content/drafts${query}`, { token });
  },

  // Content - YouTube
  getYouTubeProjects(token: string, projectType?: string) {
    const query = projectType ? `?project_type=${projectType}` : "";
    return apiFetch<YouTubeProject[]>(`/api/content/youtube${query}`, { token });
  },
  createYouTubeProject(token: string, data: {
    title: string;
    project_type: string;
    topic?: string;
    target_age?: string;
    duration_minutes?: number;
    channel_name?: string;
    season?: number;
    episode_number?: number;
  }) {
    return apiFetch<YouTubeProject>("/api/content/youtube", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  },
  generateYouTubeScript(token: string, projectId: number) {
    return apiFetch<YouTubeProject>(`/api/content/youtube/${projectId}/generate-script`, {
      method: "POST",
      token,
    });
  },

  // Content - Podcast
  getPodcastEpisodes(token: string) {
    return apiFetch<PodcastEpisode[]>("/api/content/podcast", { token });
  },
  createPodcastEpisode(token: string, data: {
    title: string;
    show_name?: string;
    topic?: string;
    duration_minutes?: number;
    voice_style?: string;
    episode_number?: number;
  }) {
    return apiFetch<PodcastEpisode>("/api/content/podcast", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  },
  generatePodcastScript(token: string, episodeId: number) {
    return apiFetch<PodcastEpisode>(`/api/content/podcast/${episodeId}/generate-script`, {
      method: "POST",
      token,
    });
  },

  // Documents
  getDocuments(token: string, docType?: string) {
    const query = docType ? `?doc_type=${docType}` : "";
    return apiFetch<DocumentProject[]>(`/api/documents/${query}`, { token });
  },
  createDocument(token: string, data: { title: string; doc_type: string; format_style?: string; content?: string; notes?: string }) {
    return apiFetch<DocumentProject>("/api/documents/", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  },
  formatDocument(token: string, docId: number) {
    return apiFetch<DocumentProject>(`/api/documents/${docId}/format`, {
      method: "POST",
      token,
    });
  },

  // Email Management
  getEmailRules(token: string) {
    return apiFetch<EmailRule[]>("/api/email/rules", { token });
  },
  createEmailRule(token: string, data: { name: string; rule_type: string; condition_field: string; condition_value: string }) {
    return apiFetch<EmailRule>("/api/email/rules", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  },
  deleteEmailRule(token: string, ruleId: number) {
    return apiFetch<{ detail: string }>(`/api/email/rules/${ruleId}`, {
      method: "DELETE",
      token,
    });
  },
  toggleEmailRule(token: string, ruleId: number) {
    return apiFetch<EmailRule>(`/api/email/rules/${ruleId}/toggle`, {
      method: "PUT",
      token,
    });
  },
  getEmailLogs(token: string, limit?: number) {
    const query = limit ? `?limit=${limit}` : "";
    return apiFetch<EmailLog[]>(`/api/email/logs${query}`, { token });
  },
  analyzeEmails(token: string, emails: Array<{ from: string; subject: string; body?: string; labels?: string[] }>) {
    return apiFetch<{ results: Array<{ from: string; subject: string; action: string; reason: string }>; total: number }>(
      "/api/email/analyze",
      {
        method: "POST",
        token,
        body: JSON.stringify({ emails }),
      }
    );
  },

  // Business
  getIncome(token: string) {
    return apiFetch<IncomeRecord[]>("/api/business/income", { token });
  },
  createIncome(token: string, data: { source: string; amount: number; date: string; description?: string }) {
    return apiFetch<IncomeRecord>("/api/business/income", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  },
  getMoneySnapshot(token: string) {
    return apiFetch<MoneySnapshot>("/api/business/snapshot", { token });
  },

  // Analytics
  getWatchlist(token: string) {
    return apiFetch<WatchlistItem[]>("/api/analytics/watchlist", { token });
  },
  getTrades(token: string) {
    return apiFetch<TradeLogEntry[]>("/api/analytics/trades", { token });
  },

  // Chat
  getChatMessages(token: string, limit = 50) {
    return apiFetch<ChatMessage[]>(`/api/chat/messages?limit=${limit}`, { token });
  },
  sendChatMessage(token: string, content: string) {
    return apiFetch<ChatReply>("/api/chat/send", {
      method: "POST",
      token,
      body: JSON.stringify({ content }),
    });
  },

  // Browser
  browserAction(token: string, data: BrowserActionRequest) {
    return apiFetch<BrowserActionResponse>("/api/browser/action", {
      method: "POST",
      token,
      body: JSON.stringify(data),
    });
  },
};
