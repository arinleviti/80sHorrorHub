"use client";

import { usePageView } from "@/hooks/usePageView";

export default function AnalyticsTracker() {
  usePageView();
  return null;
}