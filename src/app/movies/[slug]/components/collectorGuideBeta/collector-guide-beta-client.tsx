"use client";

import { useState } from "react";
import Offcanvas from "react-bootstrap/Offcanvas";
import type { GuideContent } from "@/collectorGuide/pipeline/writer";
import styles from "./collector-guide-beta.module.css";

interface CollectorGuideBetaClientProps {
  content: GuideContent;
  updatedAt: string; // ISO date of the published guide
}

const SECTIONS: { key: keyof GuideContent; title: string }[] = [
  { key: "whatToCollect", title: "What to collect" },
  { key: "market", title: "On the market now" },
];

export default function CollectorGuideBetaClient({ content, updatedAt }: CollectorGuideBetaClientProps) {
  const [open, setOpen] = useState(false);
  const updated = new Date(updatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen((o) => !o)}>
        Collector&apos;s Guide <span className={styles.badge}>Beta</span>
      </button>

      {/* No backdrop and scroll enabled, so the page stays scrollable while the guide is open. */}
      <Offcanvas
        show={open}
        onHide={() => setOpen(false)}
        placement="end"
        backdrop={false}
        scroll
        className={styles.panel}
      >
        <Offcanvas.Header closeButton closeVariant="white">
          <Offcanvas.Title className={styles.title}>
            Collector&apos;s Guide <span className={styles.badge}>Beta</span>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <p className={styles.note}>
            AI-written from our current eBay selection and checked automatically against it. Updated {updated}.
          </p>
          {SECTIONS.map(({ key, title }) => (
            <section key={key} className={styles.section}>
              <h2 className={styles.sectionTitle}>{title}</h2>
              {content[key]
                .split(/\n{2,}/)
                .filter((p) => p.trim())
                .map((paragraph, i) => (
                  <p key={i} className={styles.paragraph}>{paragraph}</p>
                ))}
            </section>
          ))}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
