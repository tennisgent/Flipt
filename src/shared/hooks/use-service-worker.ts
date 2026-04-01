import { useState, useEffect, useCallback } from "react";

export const useServiceWorker = () => {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Only register in production
    if (import.meta.env.DEV) return;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        setRegistration(reg);

        // Check if there's already a waiting worker (e.g. user opened a new tab)
        if (reg.waiting) {
          setNeedsUpdate(true);
        }

        // Listen for new service worker installing
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            // New SW is installed and waiting to activate
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setNeedsUpdate(true);
            }
          });
        });

        // When the new SW takes over, reload the page
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });
      } catch (err) {
        console.error("SW registration failed:", err);
      }
    };

    registerSW();
  }, []);

  const updateApp = useCallback(() => {
    const waiting = registration?.waiting;
    if (waiting) {
      waiting.postMessage({ type: "SKIP_WAITING" });
    }
  }, [registration]);

  const dismissUpdate = useCallback(() => {
    setNeedsUpdate(false);
  }, []);

  return { needsUpdate, updateApp, dismissUpdate };
};
