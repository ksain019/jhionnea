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
  title: string;
  feedback: string | null;
  grade: string | null;
  status: string;
  created_at: string;
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

  // Teaching
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
  getAssignments(token: string) {
    return apiFetch<Assignment[]>("/api/teaching/assignments", { token });
  },

  // Content
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
};
