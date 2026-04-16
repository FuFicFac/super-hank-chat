"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiSessionSummary } from "@/types/api";

export function useSessionList() {
  const [sessions, setSessions] = useState<ApiSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error("Failed to load sessions");
      const data = (await res.json()) as { sessions: ApiSessionSummary[] };
      setSessions(data.sessions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { sessions, loading, error, refresh };
}
