"use client";

import { useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const PING_INTERVAL = 4 * 60 * 1000; // 4 minutes

export default function Keepalive() {
  useEffect(() => {
    const ping = () => {
      fetch(`${API_BASE}/`, { method: "GET" }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, PING_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return null;
}
