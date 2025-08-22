import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Intel } from "../types";

export function useIntel() {
  const [data, setData] = useState<Intel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    api
      .get<{ results: Intel[] }>("/api/intel", { signal: ac.signal })
      .then((d) => setData(d?.results ?? []))
      .catch((e) => {
        if (!ac.signal.aborted) setError(e);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, []);

  return { data, loading, error };
}
