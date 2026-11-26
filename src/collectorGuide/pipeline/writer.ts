// Claude call #1: writes the guide from the computed facts only.
import { z } from "zod";
import { GUIDE_WORDS } from "../config";
import type { MarketFacts } from "../types";
import { askStructured } from "./claude";

export const GuideSchema = z.object({
  whatToCollect: z.string().describe("Section 1: what to collect"),
  market: z.string().describe("Section 2: what's on the market now"),
});
export type GuideContent = z.infer<typeof GuideSchema>;

// Read-only background from the existing CollectorDescription / AiDescription tables.
export type FilmBackground = {
  title: string;
  year: string;
  hook: string;
  identity: string;
  collectorFocus: string;
  context: string;
  productionContext: string | null;
  reception: string | null;
};

export type WriterFeedback = {
  previousDraft: GuideContent;
  problems: string[];
};

const SYSTEM = `You write the Collector's Guide for one 1970s–80s horror film on Retro Horror Hub, a site for horror memorabilia collectors.

Readers have seen the film and know it well. Never summarise the plot or explain why the film matters; go straight to the collecting. Always write from a collector's point of view: what to look for and what the current listings mean for someone buying. The film background is there only to explain why a particular item is desirable.

Return two sections. Each has one job; never repeat a point made in the other.
1. whatToCollect (about 250–400 words) — the item types worth collecting for this film and, for each, what distinguishes a desirable example (e.g. original release vs later reissue, signed vs unsigned, complete vs partial set), using listing titles from the input as examples. No prices here.
2. market (about 250–450 words) — the numbers: what is listed right now, the price range and average per category, the cheapest way in, the standout high-end pieces, how the selection has moved over the past week and month, and which listings have stayed up longest. Give the collector a clear take: which tier is the realistic entry point and where the money goes at the top end.

Open each section with its most interesting point, not a general statement. Split each section into 3–5 short paragraphs of 2–4 sentences each, separated by a blank line (two newline characters).

The two sections together must be ${GUIDE_WORDS.min}–${GUIDE_WORDS.max} words.

Rules for facts:
- Use only the information in the input. Do not add film trivia, prices, counts, dates or claims that are not there.
- Every price, count and percentage must be copied exactly from the input. You may round a price to the nearest whole dollar (e.g. $94.14 → $94). Never estimate or invent a number.
- Never compare numbers yourself. Every comparison comes from "rankings" or from a category's "cheapest", "mostExpensive" and "listings":
  - the cheapest or most expensive listing overall: first entry of "rankings.cheapestListings" / "rankings.mostExpensiveListings"
  - the top or bottom of a category: that category's "cheapest" / "mostExpensive"
  - which category is pricier, cheaper, larger or smaller: "rankings.categoriesByAverage" / "rankings.categoriesBySize"; if two have the same value, say they are level
  - Never write "the lowest anywhere", "the most expensive", "the largest group", "the premium end" or any other ranking that these lists do not state directly.
- Never claim that a feature in a title (complete, signed, new, sealed, graded, rolled, linen-backed…) makes an item cost more or less. State each listing's price as it is; the reader can compare.
- Trends come only from "week" and "month", which compare today's selection with our check on "baselineDate". Describe only what they contain:
  - If a window is null, there is not enough history for it yet: say nothing at all about that period, about trends, or about when tracking started. (The page shows the tracking date separately.)
  - "turnover" is the only way to describe how much the selection changed; use "newCount", "goneCount" and "turnoverPct" for numbers.
  - A category's price moved only if its "direction" is "higher" or "lower"; for "stable" say prices held steady. Categories not listed in "categoryTrends" were too small to compare, so say nothing about their trend.
  - Never say rising, falling, surging or similar unless a "direction" says so.
- New and gone listings compare our curated selection, not all of eBay. A listing that is gone may simply have ended — never say an item sold, is selling fast, sold out, or was snapped up. Say "new in our selection", "no longer listed" or "high turnover" instead. Avoid the word "sold" entirely, even in neutral phrases like "sold as tested"; write "offered" or "listed".
- "longListed" are listings that have stayed in our selection for "ageDays" days since "firstSeen" (at least, as our tracking began on "trackedSince"). Say they have been listed for at least that long; do not claim why.
- Do not give investment advice or predict future prices.
- Some listings may be for a different film or product that shares a word in its title. Leave those out.
- Write for site visitors: never mention internal terms such as "snapshot", "baseline", "window", "input" or "data". Say "listed right now", "in our selection" or, when that window exists, "over the past week".

Write in plain, confident English for enthusiasts. Be specific: name actual listings and prices from the input rather than speaking in generalities.`;

function marketInput(facts: MarketFacts) {
  return {
    currency: facts.currency,
    totalListings: facts.totalListings,
    rankings: facts.rankings,
    categories: facts.categories,
    trackedSince: facts.trackedSince,
    week: facts.week,
    month: facts.month,
    longListed: facts.longListed,
  };
}

export async function writeGuide(
  background: FilmBackground,
  facts: MarketFacts,
  feedback?: WriterFeedback
): Promise<GuideContent> {
  const input = { film: background, market: marketInput(facts) };
  let message = `Input:\n${JSON.stringify(input, null, 2)}`;

  if (feedback) {
    message +=
      `\n\nYour previous draft was rejected. Rewrite it and fix every problem below without introducing new ones.` +
      `\n\nProblems:\n${feedback.problems.map((p) => `- ${p}`).join("\n")}` +
      `\n\nPrevious draft:\n${JSON.stringify(feedback.previousDraft, null, 2)}`;
  }

  return askStructured(GuideSchema, SYSTEM, message);
}
