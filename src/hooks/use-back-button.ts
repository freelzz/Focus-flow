import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Android hardware back button.
 *
 * With no listener registered Capacitor walks the WebView history and then
 * destroys the activity at the root — which would tear down a running focus
 * session without warning. Instead: step back through the router while there
 * is somewhere to go, and minimise rather than exit at the root, so the timer
 * keeps running in the background.
 *
 * No-op on the web, where the browser owns the back button.
 */
export function useAndroidBackButton() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    let remove: (() => void) | undefined;

    void CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack && router.history.canGoBack()) {
        router.history.back();
      } else {
        void CapacitorApp.minimizeApp();
      }
    }).then((handle) => {
      if (cancelled) {
        void handle.remove();
        return;
      }
      remove = () => void handle.remove();
    });

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [router]);
}
