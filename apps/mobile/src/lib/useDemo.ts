import { useEffect, useState } from "react";
import { getDemo } from "./api";
export function useDemo<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 5000);
    getDemo<T>(path, controller.signal)
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active)
          setError(
            "API indisponível. Confira se o servidor está ligado e tente novamente.",
          );
      })
      .finally(() => {
        clearTimeout(timer);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [path, attempt]);
  return {
    data,
    error,
    loading,
    retry: () => {
      setLoading(true);
      setError(null);
      setData(null);
      setAttempt((a) => a + 1);
    },
  };
}
