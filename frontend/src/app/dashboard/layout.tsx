"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getToken, getUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

interface SidebarContextType {
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType>({ toggleSidebar: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    setUserName(user.full_name);
    setUserRole(user.role);
    setReady(true);
  }, [router]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarContext.Provider value={{ toggleSidebar }}>
      <div className="flex min-h-screen">
        <Sidebar
          userName={userName}
          userRole={userRole}
          isOpen={sidebarOpen}
          onClose={closeSidebar}
        />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {children}
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
