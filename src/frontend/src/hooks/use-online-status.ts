import { useEffect, useState } from "react";

/**
 * Track the browser's connectivity state.
 *
 * `navigator.onLine` is a coarse signal, but it is the only one available
 * without a heartbeat, and it is exactly what the offline-first timer needs:
 * the worker must always know whether their shift is synced.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
