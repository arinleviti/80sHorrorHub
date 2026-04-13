const GA_ID = "G-1Q15D7ZWMZ";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const enableAnalytics = (): void => {
  if (typeof window === "undefined") return;

  // prevent double loading
  if (window.gtag) return;

  // load Google script
  const script = document.createElement("script");
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.async = true;

  document.head.appendChild(script);

  // initialize dataLayer safely
  window.dataLayer = window.dataLayer ?? [];

  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };

  window.gtag("js", new Date());
  window.gtag("config", GA_ID, {
    anonymize_ip: true,
  });
};