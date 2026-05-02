"use client";

import { useRouter } from "next/navigation";
import { clearAuth } from "@/lib/auth";

export default function Header({ title }: { title: string }) {
  const router = useRouter();

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <header className="h-16 bg-card-bg border-b border-card-border flex items-center justify-between px-8">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <button
        onClick={handleLogout}
        className="text-sm text-muted hover:text-foreground transition-colors"
      >
        Sign out
      </button>
    </header>
  );
}
