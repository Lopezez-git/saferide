import { useEffect, useState } from "react";

export function useCurrentMinute() {
  const [timestamp, setTimestamp] = useState(() => Date.now());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function schedule() {
      timer = setTimeout(() => {
        setTimestamp(Date.now());
        schedule();
      }, 60_000 - Date.now() % 60_000);
    }
    schedule();
    return () => clearTimeout(timer);
  }, []);
  return timestamp;
}
