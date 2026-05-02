"use client";

import { useRouter } from "next/navigation";
import { clearAuth } from "@/lib/auth";

interface HeaderProps {
  title: string;
  onMenuToggle?: () => void;
}

export default function Header({ title, onMenuToggle }: HeaderProps) {
  const router = useRouter();

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <header className="h-16 bg-card-bg border-b border-card-border flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 -ml-2 text-muted hover:text-foreground transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <h2 className="text-lg md:text-xl font-semibold text-foreground truncate">{title}</h2>
      </div>
      <button
        onClick={handleLogout}
        className="text-sm text-muted hover:text-foreground transition-colors whitespace-nowrap ml-2"
      >
        Sign out
      </button>
    </header>
  );
}
