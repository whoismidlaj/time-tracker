"use client";
import { useEffect } from "react";

export function PWAUpdater() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let refreshing = false;

    // The event listener that reloads the page when the service worker is updated
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // Periodically check for updates
    const checkUpdate = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        // This will trigger an update check and eventually fire 'controllerchange' 
        // if a new SW is waiting and skipWaiting is true.
        await registration.update();
      }
    };

    // Check for update on focus (e.g. when opening the app from home screen)
    window.addEventListener("focus", checkUpdate);
    
    // Initial check
    checkUpdate();

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      window.removeEventListener("focus", checkUpdate);
    };
  }, []);

  return null;
}
