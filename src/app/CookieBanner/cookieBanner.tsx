"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Container } from "react-bootstrap";
import { enableAnalytics } from "@/lib/analytics";

type ConsentStatus = "accepted" | "rejected";

const isWindowAvailable = (): boolean => typeof window !== "undefined";

export default function CookieBanner() {
  const [show, setShow] = useState(false);

 useEffect(() => {
  if (!isWindowAvailable()) return;

  const stored = localStorage.getItem("cookieConsent") as ConsentStatus | null;

  fetch('/api/region')
    .then(res => res.json())
    .then(({ isEU }) => {
      if (!isEU) {
        enableAnalytics();
        return;
      }
      if (!stored) {
        setShow(true);
        return;
      }
      if (stored === "accepted") {
        enableAnalytics();
      }
    });
}, []);
  const handleAccept = () => {
    if (!isWindowAvailable()) return;

    localStorage.setItem("cookieConsent", "accepted");
    localStorage.setItem("cookieConsentDate", new Date().toISOString());

    setShow(false);
    enableAnalytics();
  };

  const handleReject = () => {
    if (!isWindowAvailable()) return;

    localStorage.setItem("cookieConsent", "rejected");
    localStorage.setItem("cookieConsentDate", new Date().toISOString());

    setShow(false);
  };

  if (!show) return null;

  return (
    <Alert
      variant="dark"
      className="border-0 rounded-0 m-0 py-5"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "var(--color-background)",
        borderTop: "1px solid var(--color-primary)",
      }}
    >
      <Container
        className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3"
      >
        {/* TEXT */}
        <div style={{ fontSize: "0.85rem", color: "var(--color-text)" }}>
          We use cookies to analyze traffic and improve the experience. You can
          accept or reject analytics cookies. Read our{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--color-primary)",
              textDecoration: "underline",
            }}
          >
            Privacy Policy
          </a>.
        </div>

        {/* BUTTONS */}
        <div className="d-flex gap-2">
          <Button
            variant="light"
            onClick={handleAccept}
            className="text-uppercase"
            style={{
              fontFamily: "Eighties Horror, sans-serif",
            }}
          >
            Accept
          </Button>

          <Button
            variant="outline-light"
            onClick={handleReject}
            className="text-uppercase"
            style={{
              fontFamily: "Eighties Horror, sans-serif",
              borderColor: "var(--color-primary)",
              color: "var(--color-primary)",
            }}
          >
            Reject
          </Button>
        </div>
      </Container>
    </Alert>
  );
}