// Claude call #1: writes the guide from the computed facts only.
import { z } from "zod";
import { GUIDE_WORDS } from "../config";
import type { MarketFacts, SnapshotListing } from "../types";
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
2. market (about 250–450 words) — the numbers: what is listed right now, the price range and average per category, the cheapest way in, the standout high-end pieces, and changes since the previous check. Give the collector a clear take: which tier is the realistic entry point and where the money goes at the top end.

Open each section with its most interesting point, not a general statement. Split each section into 3–5 short paragraphs of 2–4 sentences each, separated by a blank line (two newline characters).

The two sections together must be ${GUIDE_WORDS.min}–${GUIDE_WORDS.max} words.

Rules for facts:
- Use only the information in the input. Do not add film trivia, prices, counts, dates or claims that are not there.
- Every price, count and percentage must be copied exactly from the input. You may round a price to the nearest whole dollar (e.g. $94.14 → $94). Never estimate or invent a number.
- "newListings" and "goneListings" compare our curated selection with the previous check. A listing that is gone may simply have ended — never say an item sold, is selling fast, sold out, or was snapped up. Say "new in our selection", "no longer listed" or "high turnover" instead.
- The "activity" label is the only trend you may describe:
  - "first snapshot": there is no previous check, so describe the current listings only and do not mention changes.
  - "no change" or "no meaningful change": say briefly that little has changed, or skip changes entirely. No talk of rising, falling or heating up.
  - "moderate activity" / "high activity": describe the listed changes, and only those.
- Do not give investment advice or predict future prices.
- Some listings may be for a different film or product that shares a word in its title. Leave those out.
- Write for site visitors: never mention internal terms such as "snapshot", "activity label", "input" or "data". Say "listed right now", "in our selection" or "since our last check".

Write in plain, confident English for enthusiasts. Be specific: name actual listings and prices from the input rather than speaking in generalities.`;

function marketInput(facts: MarketFacts, listings: SnapshotListing[]) {
  const strip = ({ title, category, price }: SnapshotListing) => ({ title, category, price });
  return {
    currency: facts.currency,
    activity: facts.activity,
    totalListings: facts.totalListings,
    previousTotalListings: facts.previousTotalListings,
    newListings: facts.newListings.map(strip),
    goneListings: facts.goneListings.map(strip),
    priceChanges: facts.priceChanges.map(({ title, category, from, to, changePct }) => ({
      title, category, from, to, changePct,
    })),
    categories: facts.categories.map(({ cheapest, ...stats }) => ({
      ...stats,
      cheapest: { title: cheapest.title, price: cheapest.price },
    })),
    mostExpensiveListings: [...listings].sort((a, b) => b.price - a.price).slice(0, 5).map(strip),
  };
}

export async function writeGuide(
  background: FilmBackground,
  facts: MarketFacts,
  listings: SnapshotListing[],
  feedback?: WriterFeedback
): Promise<GuideContent> {
  const input = { film: background, market: marketInput(facts, listings) };
  let message = `Input:\n${JSON.stringify(input, null, 2)}`;

  if (feedback) {
    message +=
      `\n\nYour previous draft was rejected. Rewrite it and fix every problem below without introducing new ones.` +
      `\n\nProblems:\n${feedback.problems.map((p) => `- ${p}`).join("\n")}` +
      `\n\nPrevious draft:\n${JSON.stringify(feedback.previousDraft, null, 2)}`;
  }

  return askStructured(GuideSchema, SYSTEM, message);
}
