"use client";

import { useState } from "react";
import Offcanvas from "react-bootstrap/Offcanvas";
import { GUIDE_SECTION_TITLES } from "@/collectorGuide/config";
import type { GuideContent } from "@/collectorGuide/pipeline/writer";
import styles from "./collector-guide-beta.module.css";

interface CollectorGuideBetaClientProps {
  content: GuideContent;
  updatedAt: string; // ISO date of the published guide
  trackedSince: string; // ISO date of the film's first eBay snapshot
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const SECTIONS = (Object.keys(GUIDE_SECTION_TITLES) as (keyof GuideContent)[]).map((key) => ({
  key,
  title: GUIDE_SECTION_TITLES[key],
}));

export default function CollectorGuideBetaClient({ content, updatedAt, trackedSince }: CollectorGuideBetaClientProps) {
  const [open, setOpen] = useState(false);

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
            AI-written from our current eBay selection and checked automatically against it. Updated{" "}
            {formatDate(updatedAt)}. Prices tracked since {formatDate(trackedSince)}; weekly and monthly trends
            appear as history builds up.
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
