"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function usePageView(): void {
  const pathname = usePathname();
  const firstLoad = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.gtag) return;

    // Check if user has explicitly accepted analytics via Silktide
    const analyticsConsent = window.localStorage.getItem("silktideCookieChoice_analytics");
    if (analyticsConsent !== "true") return;

    // Always send pageview
    window.gtag("config", "G-1Q15D7ZWMZ", {
      page_path: pathname,
    });

    firstLoad.current = false;
  }, [pathname]);
}