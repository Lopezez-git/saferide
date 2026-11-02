import { useEffect, useState } from "react";
import { api, message } from "./client";
export function useResource<T>(path: string, token?: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    api<T>(path, { token, signal: c.signal })
      .then((d) => {
        if (!c.signal.aborted) setData(d);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [path, token, version]);
  return {
    data,
    error,
    loading,
    refresh: () => {
      setError("");
      setLoading(true);
      setVersion((v) => v + 1);
    },
  };
}
