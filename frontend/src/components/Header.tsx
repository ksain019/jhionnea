"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, getToken } from "@/lib/auth";
import { api } from "@/lib/api";

interface HeaderProps {
  title: string;
  onMenuToggle?: () => void;
}

export default function Header({ title, onMenuToggle }: HeaderProps) {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ type: string; title: string; subtitle: string; link: string }>
  >([]);
  const [showSearch, setShowSearch] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("jhionnea-dark");
    if (saved === "true") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api
      .getNotifications(token)
      .then((d) => setUnread(d.unread_count))
      .catch(() => {});
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("jhionnea-dark", String(next));
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const token = getToken();
    if (!token) return;
    try {
      const data = await api.searchAll(token, q);
      setSearchResults(data.results);
      setShowSearch(true);
    } catch {
      /* ignore */
    }
  }, []);

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <header className="h-16 bg-card-bg border-b border-card-border flex items-center justify-between px-4 md:px-8 relative">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 -ml-2 text-muted hover:text-foreground transition-colors"
            aria-label="Open menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}
        <h2 className="text-lg md:text-xl font-semibold text-foreground truncate">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <input
            className="w-48 lg:w-64 px-3 py-1.5 text-sm border border-card-border rounded-lg bg-background text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
          />
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 right-0 w-80 bg-card-bg border border-card-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              {searchResults.slice(0, 10).map((r, i) => (
                <button
                  key={i}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                  onClick={() => {
                    router.push(r.link);
                    setShowSearch(false);
                    setSearchQuery("");
                  }}
                >
                  <span className="text-xs px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded capitalize">
                    {r.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {r.title}
                    </p>
                    <p className="text-xs text-muted truncate">{r.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications bell */}
        <button
          onClick={() => router.push("/dashboard/notifications")}
          className="relative p-2 text-muted hover:text-foreground transition-colors"
          title="Notifications"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {unread}
            </span>
          )}
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="p-2 text-muted hover:text-foreground transition-colors"
          title={dark ? "Light mode" : "Dark mode"}
        >
          {dark ? (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>

        <button
          onClick={handleLogout}
          className="text-sm text-muted hover:text-foreground transition-colors whitespace-nowrap ml-1"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
