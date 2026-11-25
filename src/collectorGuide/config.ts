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

// Total length of the two sections together.
export const GUIDE_WORDS = { min: 450, max: 900 };

// Each section must be split into at least this many paragraphs (blank-line separated).
export const MIN_PARAGRAPHS_PER_SECTION = 3;

// Section headings as readers see them (used by the page and by the judge, which reads the same text).
export const GUIDE_SECTION_TITLES = {
  whatToCollect: "What to collect",
  market: "On the market now",
} as const;

// Judge pass rule: no criterion below MIN_SCORE and an average of at least MIN_AVERAGE (scores are 1–5).
export const JUDGE_MIN_SCORE = 3;
export const JUDGE_MIN_AVERAGE = 3.0;

// When a film's newest snapshot only has a flagged guide, later runs retry it (same data)
// up to this many times instead of waiting for the next eBay refresh.
export const FLAGGED_RETRY_RUNS = 3;

// ─── Trends (all computed in code) ───────────────────────────────────────────
// Snapshots only happen when the eBay cache refreshes, so they are irregular: each window
// compares against the newest snapshot that is at least `minAgeDays` old.
export const TREND_WINDOWS = [
  { key: "week", days: 7, minAgeDays: 6 },
  { key: "month", days: 30, minAgeDays: 25 },
] as const;

// A category's average price counts as "higher"/"lower" beyond this change, and only
// when it has at least CATEGORY_TREND_MIN_LISTINGS listings at both ends of the window.
export const CATEGORY_TREND_THRESHOLD_PCT = 10;
export const CATEGORY_TREND_MIN_LISTINGS = 3;

// Share of current listings that are new since the window's baseline.
export const TURNOVER_HIGH_PCT = 50;
export const TURNOVER_LOW_PCT = 20;

// Listings in our selection for at least this long are reported as long-listed.
export const LONG_LISTED_DAYS = 14;

// ─── Retention for the guide's own tables (pruned at the end of each run) ────
export const SNAPSHOT_RETENTION_DAYS = 90; // the newest snapshot per film is always kept
export const GUIDES_KEPT_PER_FILM = 10; // the latest published guide is always kept on top of these
export const RUN_LOG_RETENTION_DAYS = 90;
