// Computes every market fact the guide may use: current prices per category, 7- and 30-day
// comparisons against older snapshots, and how long listings have been in our selection.
// Pure code, no database and no LLM, so it is easy to test and fully deterministic.
import {
  CATEGORY_TREND_MIN_LISTINGS,
  CATEGORY_TREND_THRESHOLD_PCT,
  LONG_LISTED_DAYS,
  TREND_WINDOWS,
  TURNOVER_HIGH_PCT,
  TURNOVER_LOW_PCT,
} from "../config";
import type {
  CategoryStats,
  CategoryTrend,
  ListingAge,
  ListingRef,
  ListingSet,
  MarketFacts,
  PriceChange,
  Rankings,
  SnapshotListing,
  Turnover,
  WindowFacts,
} from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const pct = (from: number, to: number) => round2(((to - from) / from) * 100);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const ageDays = (from: Date, to: Date) => Math.floor((to.getTime() - from.getTime()) / DAY_MS);

function groupByCategory(listings: SnapshotListing[]): Map<string, SnapshotListing[]> {
  const groups = new Map<string, SnapshotListing[]>();
  for (const l of listings) groups.set(l.category, [...(groups.get(l.category) ?? []), l]);
  return groups;
}

const average = (items: SnapshotListing[]) => round2(items.reduce((a, b) => a + b.price, 0) / items.length);

function categoryStats(listings: SnapshotListing[]): CategoryStats[] {
  return [...groupByCategory(listings).entries()]
    .map(([category, items]) => {
      const byPrice = [...items].sort((a, b) => a.price - b.price);
      const cheapest = byPrice[0];
      const mostExpensive = byPrice[byPrice.length - 1];
      return {
        category,
        count: items.length,
        avgPrice: average(items),
        minPrice: cheapest.price,
        maxPrice: mostExpensive.price,
        cheapest: { title: cheapest.title, price: cheapest.price },
        mostExpensive: { title: mostExpensive.title, price: mostExpensive.price },
        listings: byPrice.map(({ title, price }) => ({ title, price })),
      };
    })
    .sort((a, b) => b.count - a.count);
}

function rankings(listings: SnapshotListing[], categories: CategoryStats[]): Rankings {
  const ref = ({ title, category, price }: SnapshotListing): ListingRef => ({ title, category, price });
  const byPrice = [...listings].sort((a, b) => a.price - b.price);
  return {
    cheapestListings: byPrice.slice(0, 5).map(ref),
    mostExpensiveListings: byPrice.slice(-5).reverse().map(ref),
    categoriesByAverage: [...categories]
      .sort((a, b) => b.avgPrice - a.avgPrice)
      .map(({ category, avgPrice }) => ({ category, avgPrice })),
    categoriesBySize: categories.map(({ category, count }) => ({ category, count })), // already sorted by count
  };
}

function labelTurnover(turnoverPct: number): Turnover {
  if (turnoverPct > TURNOVER_HIGH_PCT) return "high turnover";
  if (turnoverPct < TURNOVER_LOW_PCT) return "low turnover";
  return "moderate turnover";
}

function categoryTrends(then: SnapshotListing[], now: SnapshotListing[]): CategoryTrend[] {
  const thenGroups = groupByCategory(then);
  const trends: CategoryTrend[] = [];
  for (const [category, nowItems] of groupByCategory(now)) {
    const thenItems = thenGroups.get(category) ?? [];
    // Small categories swing on a single listing, so they are not compared.
    if (thenItems.length < CATEGORY_TREND_MIN_LISTINGS || nowItems.length < CATEGORY_TREND_MIN_LISTINGS) continue;

    const avgThen = average(thenItems);
    const avgNow = average(nowItems);
    const changePct = pct(avgThen, avgNow);
    trends.push({
      category,
      countThen: thenItems.length,
      countNow: nowItems.length,
      avgThen,
      avgNow,
      changePct,
      direction:
        changePct >= CATEGORY_TREND_THRESHOLD_PCT ? "higher"
        : changePct <= -CATEGORY_TREND_THRESHOLD_PCT ? "lower"
        : "stable",
    });
  }
  return trends;
}

function compareWindow(days: number, baseline: ListingSet, current: ListingSet): WindowFacts {
  const thenById = new Map(baseline.listings.map((l) => [l.listingId, l]));
  const nowIds = new Set(current.listings.map((l) => l.listingId));

  const newCount = current.listings.filter((l) => !thenById.has(l.listingId)).length;
  const goneCount = baseline.listings.filter((l) => !nowIds.has(l.listingId)).length;
  const turnoverPct = current.listings.length ? round2((newCount / current.listings.length) * 100) : 0;

  const priceChanges: PriceChange[] = [];
  for (const l of current.listings) {
    const before = thenById.get(l.listingId);
    if (before && before.price !== l.price) {
      priceChanges.push({ title: l.title, category: l.category, from: before.price, to: l.price, changePct: pct(before.price, l.price) });
    }
  }

  return {
    days,
    baselineDate: isoDate(baseline.takenAt),
    baselineAgeDays: ageDays(baseline.takenAt, current.takenAt),
    totalThen: baseline.listings.length,
    totalNow: current.listings.length,
    newCount,
    goneCount,
    stillListedCount: current.listings.length - newCount,
    turnoverPct,
    turnover: labelTurnover(turnoverPct),
    categoryTrends: categoryTrends(baseline.listings, current.listings),
    priceChanges,
  };
}

// First time each current listing appeared in the kept history (or now, if it is new).
function longListed(history: ListingSet[], current: ListingSet): ListingAge[] {
  const firstSeen = new Map<string, Date>();
  for (const snap of history) {
    for (const l of snap.listings) {
      const seen = firstSeen.get(l.listingId);
      if (!seen || snap.takenAt < seen) firstSeen.set(l.listingId, snap.takenAt);
    }
  }

  return current.listings
    .map((l) => {
      const seen = firstSeen.get(l.listingId) ?? current.takenAt;
      return { title: l.title, category: l.category, price: l.price, firstSeen: isoDate(seen), ageDays: ageDays(seen, current.takenAt) };
    })
    .filter((l) => l.ageDays >= LONG_LISTED_DAYS)
    .sort((a, b) => b.ageDays - a.ageDays || b.price - a.price)
    .slice(0, 5);
}

// `history` = the film's earlier snapshots (any order), not including `current`.
export function computeFacts(history: ListingSet[], current: ListingSet): MarketFacts {
  const sorted = [...history].sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  const oldest = sorted[0]?.takenAt ?? current.takenAt;

  // Each window uses the newest snapshot that is old enough; none = not enough history yet.
  const windows = TREND_WINDOWS.map(({ days, minAgeDays }) => {
    const baseline = [...sorted].reverse().find((s) => ageDays(s.takenAt, current.takenAt) >= minAgeDays);
    return baseline ? compareWindow(days, baseline, current) : null;
  });

  const categories = categoryStats(current.listings);

  return {
    currency: current.listings[0]?.currency ?? "USD",
    totalListings: current.listings.length,
    categories,
    rankings: rankings(current.listings, categories),
    trackedSince: isoDate(oldest),
    historyDays: ageDays(oldest, current.takenAt),
    week: windows[0],
    month: windows[1],
    longListed: longListed(sorted, current),
  };
}
