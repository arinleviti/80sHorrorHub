const GA_ID = "G-1Q15D7ZWMZ";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const enableAnalytics = (): void => {
  if (typeof window === "undefined") return;
console.log("enableAnalytics called");
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? ((...args: unknown[]) => {
    window.dataLayer?.push(args);
  });

  // Tell GTM consent mode the user has accepted
  window.gtag("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "denied",
  });

  if (!document.querySelector(`script[src*="${GA_ID}"]`)) {
    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.async = true;
    document.head.appendChild(script);
  }

  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { anonymize_ip: true });
};