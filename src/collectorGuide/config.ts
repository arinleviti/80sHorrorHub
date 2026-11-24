// Collector's Guide (beta) — shared settings for the pipeline and the movie-page component.

// Films that get a guide, by their /movies/[slug] slug.
export const COLLECTOR_GUIDE_SLUGS: string[] = [
  "a-nightmare-on-elm-street",
  "the-thing",
  "halloween",
  "friday-the-13th",
  "the-shining",
  "re-animator",
];

// Claude model used for both the writer and the judge.
export const GUIDE_MODEL = "claude-haiku-5-5";

// Rewrite loop: first attempt + up to 2 rewrites, then the guide is flagged for manual review.
export const MAX_REWRITES = 2;

// Total length of the three sections together.
export const GUIDE_WORDS = { min: 600, max: 1000 };

// Judge pass rule: no criterion below MIN_SCORE and an average of at least MIN_AVERAGE (scores are 1–5).
export const JUDGE_MIN_SCORE = 3;
export const JUDGE_MIN_AVERAGE = 3.0;

// Retention for the guide's own tables (pruned at the end of each run).
export const SNAPSHOTS_KEPT_PER_FILM = 20;
export const GUIDES_KEPT_PER_FILM = 10; // the latest published guide is always kept on top of these
export const RUN_LOG_RETENTION_DAYS = 90;
