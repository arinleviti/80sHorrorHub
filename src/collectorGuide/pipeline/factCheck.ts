// Fact check in code (no LLM): every price, percentage, count and trend in the draft
// must come from the computed facts or the film background the writer was given.
import { GUIDE_WORDS, MIN_PARAGRAPHS_PER_SECTION } from "../config";
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
  { pattern: /\bsnapshots?\b|\bbaseline\b|\binput data\b/i, reason: "internal pipeline terms must not reach readers" },
];

// Upward language needs a category whose direction is "higher", downward language one that is "lower".
const UP_WORDS = /\b(surg\w*|soar\w*|spik\w*|skyrocket\w*|boom\w*|heating up|rising|climbing)\b/i;
const DOWN_WORDS = /\b(plummet\w*|crash\w*|cooling off|falling|dropping|sliding)\b/i;

const MONEY = /\$\s?(\d[\d,]*(?:\.\d+)?)(\s?(?:k|thousand|million|m)\b)?/gi;
const PERCENT = /(\d+(?:\.\d+)?)\s?%/g;
// Counts are plural ("12 listings"); the lookbehind skips prices ("$395"), issue numbers ("#19"),
// sizes ("27 x 41") and decimals, which can sit right before the word "listing".
const COUNT = /(?<![$#\d.,]|[x×]\s?)\b(\d+)\s+(?:current\s+|active\s+|more\s+)?(?:listings|items|lots)\b/gi;
const NEW_COUNT = /(?<![$#\d.,]|[x×]\s?)\b(\d+)\s+new\s+(?:listings|items|lots)\b/gi;
const DAYS = /(?<![$#\d.,])\b(\d+)\s+days?\b/gi;
const WEEKS = /(?<![$#\d.,])\b(\d+)\s+weeks?\b/gi;

function parseMoney(match: RegExpMatchArray): number {
  const value = parseFloat(match[1].replace(/,/g, ""));
  const suffix = match[2]?.trim().toLowerCase();
  if (suffix === "k" || suffix === "thousand") return value * 1_000;
  if (suffix === "m" || suffix === "million") return value * 1_000_000;
  return value;
}

// The sentence around a match, quoted in feedback so the rewrite knows exactly what to change.
function sentenceAt(text: string, index: number): string {
  const lastStop = text.lastIndexOf(". ", index);
  const start = Math.max(lastStop === -1 ? 0 : lastStop + 2, text.lastIndexOf("\n", index) + 1);
  const end = text.indexOf(".", index);
  return text.slice(start, end === -1 ? undefined : end + 1).trim();
}

// Accepts exact values and whole dollars, rounded or cut off ($140.60 → $141 or $140).
function matchesAny(value: number, allowed: number[], tolerance: number): boolean {
  return allowed.some((a) => Math.abs(a - value) <= tolerance || Math.round(a) === value || Math.floor(a) === value);
}

function allowedValues(facts: MarketFacts, listings: SnapshotListing[], background: FilmBackground) {
  const backgroundText = Object.values(background).filter(Boolean).join(" ");

  const windows = [facts.week, facts.month].filter((w) => w !== null);

  const money = [
    ...listings.map((l) => l.price),
    ...facts.categories.flatMap((c) => [c.avgPrice, c.minPrice, c.maxPrice]),
    ...windows.flatMap((w) => [
      ...w.categoryTrends.flatMap((t) => [t.avgThen, t.avgNow]),
      ...w.priceChanges.flatMap((c) => [c.from, c.to]),
    ]),
    ...[...backgroundText.matchAll(MONEY)].map(parseMoney),
  ];
  const percents = [
    ...windows.flatMap((w) => [
      w.turnoverPct,
      ...w.categoryTrends.map((t) => Math.abs(t.changePct)),
      ...w.priceChanges.map((c) => Math.abs(c.changePct)),
    ]),
    ...[...backgroundText.matchAll(PERCENT)].map((m) => parseFloat(m[1])),
  ];
  const counts = [
    facts.totalListings,
    facts.longListed.length,
    ...facts.categories.map((c) => c.count),
    ...windows.flatMap((w) => [
      w.totalThen, w.totalNow, w.newCount, w.goneCount, w.stillListedCount, w.priceChanges.length,
      ...w.categoryTrends.flatMap((t) => [t.countThen, t.countNow]),
    ]),
  ];
  const days = [
    facts.historyDays,
    ...windows.flatMap((w) => [w.days, w.baselineAgeDays]),
    ...facts.longListed.map((l) => l.ageDays),
  ];
  // "3 weeks" is fine for 21–27 days; rounding up ("4 weeks" for 25 days) would overstate it.
  const weeks = days.map((d) => Math.floor(d / 7)).filter((w) => w > 0);
  const newCounts = windows.map((w) => w.newCount);
  return { money, percents, counts, newCounts, days, weeks };
}

export function factCheck(
  draft: GuideContent,
  facts: MarketFacts,
  listings: SnapshotListing[],
  background: FilmBackground
): FactCheckResult {
  const issues: string[] = [];
  const text = [draft.whatToCollect, draft.market].join("\n\n");
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
  for (const m of text.matchAll(NEW_COUNT)) {
    if (!allowed.newCounts.includes(parseInt(m[1], 10))) {
      issues.push(`"${m[0]}" does not match the number of new listings for the past week or month.`);
    }
  }
  for (const m of text.matchAll(DAYS)) {
    if (!allowed.days.includes(parseInt(m[1], 10))) {
      issues.push(`"${m[0]}" does not match any period or listing age in the input data.`);
    }
  }
  for (const m of text.matchAll(WEEKS)) {
    if (!allowed.weeks.includes(parseInt(m[1], 10))) {
      issues.push(`"${m[0]}" does not match any period or listing age in the input data (round weeks down).`);
    }
  }

  for (const { pattern, reason } of BANNED_PHRASES) {
    const hit = text.match(pattern);
    if (hit) {
      issues.push(`"${hit[0]}" is not allowed (${reason}). Rewrite this sentence without it: "${sentenceAt(text, hit.index!)}"`);
    }
  }

  // Market section only: words like "falling" are fine when describing the film itself.
  const trends = [facts.week, facts.month].flatMap((w) => w?.categoryTrends ?? []);
  for (const [words, direction] of [[UP_WORDS, "higher"], [DOWN_WORDS, "lower"]] as const) {
    const hit = trends.some((t) => t.direction === direction) ? null : draft.market.match(words);
    if (hit) {
      issues.push(
        `"${hit[0]}" describes a price trend, but no category's prices are ${direction} over the past week or month. Rewrite: "${sentenceAt(draft.market, hit.index!)}"`
      );
    }
  }
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < GUIDE_WORDS.min || words > GUIDE_WORDS.max) {
    issues.push(`The guide is ${words} words; it must be ${GUIDE_WORDS.min}–${GUIDE_WORDS.max}.`);
  }

  for (const [section, body] of Object.entries(draft)) {
    const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim()).length;
    if (paragraphs < MIN_PARAGRAPHS_PER_SECTION) {
      issues.push(
        `The "${section}" section has ${paragraphs} paragraph(s); split it into at least ${MIN_PARAGRAPHS_PER_SECTION}, separated by a blank line.`
      );
    }
  }

  return { passed: issues.length === 0, issues };
}
