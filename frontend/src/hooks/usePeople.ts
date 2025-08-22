import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Person } from "../types";

export function usePeople() {
  const [data, setData] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    api.get<{ results: Person[] }>("/api/all", { signal: ac.signal })
      .then((d) => setData(d?.results ?? []))
      .catch((e) => { if (!ac.signal.aborted) setError(e); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, []);

  return { data, loading, error };
}
