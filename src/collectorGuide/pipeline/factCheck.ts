// Fact check in code (no LLM): every price, percentage, count and trend in the draft
// must come from the computed facts or the film background the writer was given.
import { GUIDE_WORDS } from "../config";
import type { MarketFacts, SnapshotListing } from "../types";
import type { FilmBackground, GuideContent } from "./writer";

export type FactCheckResult = { passed: boolean; issues: string[] };

const SALES_CLAIM = "a listing that is gone may have ended, not sold";
const BANNED_PHRASES: { pattern: RegExp; reason: string }[] = [
  { pattern: /\bsold\b/i, reason: SALES_CLAIM },
  { pattern: /\bsells? (?:out|fast|quickly)\b/i, reason: SALES_CLAIM },
  { pattern: /\bselling (?:out|fast|quickly|well)\b/i, reason: SALES_CLAIM },
  { pattern: /\bsnapped up\b/i, reason: SALES_CLAIM },
  { pattern: /\bflying off\b/i, reason: SALES_CLAIM },
  { pattern: /\bhigh demand\b/i, reason: "the data shows listings, not demand" },
  { pattern: /\binvestment\b/i, reason: "the guide must not give investment advice" },
  { pattern: /\bsnapshots?\b|\bactivity label\b|\binput data\b/i, reason: "internal pipeline terms must not reach readers" },
];

// Trend language only allowed when the activity label says something actually moved.
const TREND_WORDS = /\b(surg\w*|soar\w*|spik\w*|skyrocket\w*|plummet\w*|crash\w*|boom\w*|heating up|cooling off|rising|climbing|falling|dropping)\b/i;
const CALM_ACTIVITY = new Set(["first snapshot", "no change", "no meaningful change"]);

const MONEY = /\$\s?(\d[\d,]*(?:\.\d+)?)(\s?(?:k|thousand|million|m)\b)?/gi;
const PERCENT = /(\d+(?:\.\d+)?)\s?%/g;
// Counts are plural ("12 listings"); the lookbehind skips prices ("$395"), issue numbers ("#19"),
// sizes ("27 x 41") and decimals, which can sit right before the word "listing".
const COUNT = /(?<![$#\d.,]|[x×]\s?)\b(\d+)\s+(?:new\s+|current\s+|active\s+|more\s+)?(?:listings|items|lots)\b/gi;

function parseMoney(match: RegExpMatchArray): number {
  const value = parseFloat(match[1].replace(/,/g, ""));
  const suffix = match[2]?.trim().toLowerCase();
  if (suffix === "k" || suffix === "thousand") return value * 1_000;
  if (suffix === "m" || suffix === "million") return value * 1_000_000;
  return value;
}

// Accepts exact values and the whole-dollar rounding the writer is allowed to use.
function matchesAny(value: number, allowed: number[], tolerance: number): boolean {
  return allowed.some((a) => Math.abs(a - value) <= tolerance || Math.round(a) === value);
}

function allowedValues(facts: MarketFacts, listings: SnapshotListing[], background: FilmBackground) {
  const backgroundText = Object.values(background).filter(Boolean).join(" ");

  const money = [
    ...listings.map((l) => l.price),
    ...facts.goneListings.map((l) => l.price),
    ...facts.priceChanges.flatMap((c) => [c.from, c.to]),
    ...facts.categories.flatMap((c) => [c.avgPrice, c.minPrice, c.maxPrice]),
    ...[...backgroundText.matchAll(MONEY)].map(parseMoney),
  ];
  const percents = [
    ...facts.priceChanges.map((c) => Math.abs(c.changePct)),
    ...[...backgroundText.matchAll(PERCENT)].map((m) => parseFloat(m[1])),
  ];
  const counts = [
    facts.totalListings,
    facts.previousTotalListings ?? 0,
    facts.newListings.length,
    facts.goneListings.length,
    facts.priceChanges.length,
    facts.changedCount,
    ...facts.categories.map((c) => c.count),
  ];
  return { money, percents, counts };
}

export function factCheck(
  draft: GuideContent,
  facts: MarketFacts,
  listings: SnapshotListing[],
  background: FilmBackground
): FactCheckResult {
  const issues: string[] = [];
  const text = [draft.film, draft.whatToCollect, draft.market].join("\n\n");
  const allowed = allowedValues(facts, listings, background);

  for (const m of text.matchAll(MONEY)) {
    if (!matchesAny(parseMoney(m), allowed.money, 0.01)) {
      issues.push(`The price "${m[0].trim().replace(/[,.]$/, "")}" does not appear in the input data.`);
    }
  }
  for (const m of text.matchAll(PERCENT)) {
    if (!matchesAny(parseFloat(m[1]), allowed.percents, 0.5)) {
      issues.push(`The percentage "${m[0]}" does not appear in the input data.`);
    }
  }
  for (const m of text.matchAll(COUNT)) {
    if (!allowed.counts.includes(parseInt(m[1], 10))) {
      issues.push(`The count "${m[0]}" does not match any count in the input data.`);
    }
  }

  for (const { pattern, reason } of BANNED_PHRASES) {
    const hit = text.match(pattern);
    if (hit) issues.push(`"${hit[0]}" is not allowed: ${reason}.`);
  }

  // Market section only: words like "falling" are fine when describing the film itself.
  if (CALM_ACTIVITY.has(facts.activity)) {
    const hit = draft.market.match(TREND_WORDS);
    if (hit) issues.push(`"${hit[0]}" describes a trend, but the activity label is "${facts.activity}".`);
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < GUIDE_WORDS.min || words > GUIDE_WORDS.max) {
    issues.push(`The guide is ${words} words; it must be ${GUIDE_WORDS.min}–${GUIDE_WORDS.max}.`);
  }

  for (const [section, body] of Object.entries(draft)) {
    if (!body.trim()) issues.push(`The "${section}" section is empty.`);
  }

  return { passed: issues.length === 0, issues };
}
