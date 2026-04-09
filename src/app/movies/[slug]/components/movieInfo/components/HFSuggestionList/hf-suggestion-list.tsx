"use client";

import Image from "next/image";
import { Card } from "react-bootstrap";
import { HFSuggestionItem } from "@/app/services/huggingFaceAI";
import styles from "./hf-suggestion-list.module.css";
import { normalizeSlug, rawSlugToIdMap } from "@/app/services/movies";

interface HFSuggestionsListProps {
  suggestions: HFSuggestionItem[];
}

const HFSuggestionsList: React.FC<HFSuggestionsListProps> = ({ suggestions }) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <Card className={`${styles.hfSuggestionsCard} my-4`}>
      <Card.Header className={styles.hfSuggestionsHeader}>
        AI Suggested Movies
      </Card.Header>

      <div className={styles.hfSuggestionsList}>
        {suggestions.map((s, index) => {
          const rawEntry = Object.entries(rawSlugToIdMap).find(
            ([rawSlug, id]) => id === s.tmdbId
          );
          const normalizedSlug = rawEntry
            ? normalizeSlug(rawEntry[0])
            : normalizeSlug(s.title);

          return (
            <div key={s.title ?? index} className={styles.hfSuggestionItem}>
              {s.posterUrl ? (
                <a href={`/movies/${normalizedSlug}`} className={styles.hfSuggestionLink}>
                  <Image
                    src={s.posterUrl}
                    alt={s.title}
                    width={60}
                    height={90}
                    className={styles.hfSuggestionPoster}
                  />
                </a>
              ) : (
                <div className={styles.hfSuggestionPoster} style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
              )}
              <span className={styles.hfSuggestionTitle}>
                {s.title} <br /> ({s.year})
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default HFSuggestionsList;