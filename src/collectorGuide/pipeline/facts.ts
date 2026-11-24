// Compares two snapshots and computes every market fact the guide may use.
// Pure code, no database and no LLM, so it is easy to test and fully deterministic.
import type { Activity, CategoryStats, MarketFacts, PriceChange, SnapshotListing } from "../types";

const round2 = (n: number) => Math.round(n * 100) / 100;

// Movement rules (see the brief): few changes = nothing worth reporting,
// more than half the selection changed = high activity.
const MEANINGFUL_CHANGES = 3;
const HIGH_ACTIVITY_SHARE = 0.5;

function labelActivity(changedCount: number, baseline: number, isFirst: boolean): Activity {
  if (isFirst) return "first snapshot";
  if (changedCount === 0) return "no change";
  if (changedCount < MEANINGFUL_CHANGES) return "no meaningful change";
  if (changedCount / baseline > HIGH_ACTIVITY_SHARE) return "high activity";
  return "moderate activity";
}

function categoryStats(listings: SnapshotListing[]): CategoryStats[] {
  const groups = new Map<string, SnapshotListing[]>();
  for (const l of listings) {
    groups.set(l.category, [...(groups.get(l.category) ?? []), l]);
  }

  return [...groups.entries()]
    .map(([category, items]) => {
      const prices = items.map((i) => i.price);
      const cheapest = items.reduce((a, b) => (b.price < a.price ? b : a));
      return {
        category,
        count: items.length,
        avgPrice: round2(prices.reduce((a, b) => a + b, 0) / prices.length),
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        cheapest: { title: cheapest.title, price: cheapest.price, url: cheapest.url },
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function computeFacts(
  previous: SnapshotListing[] | null,
  current: SnapshotListing[]
): MarketFacts {
  const prevById = new Map((previous ?? []).map((l) => [l.listingId, l]));
  const currIds = new Set(current.map((l) => l.listingId));

  const newListings = previous ? current.filter((l) => !prevById.has(l.listingId)) : [];
  const goneListings = (previous ?? []).filter((l) => !currIds.has(l.listingId));

  const priceChanges: PriceChange[] = [];
  for (const l of current) {
    const before = prevById.get(l.listingId);
    if (before && before.price !== l.price) {
      priceChanges.push({
        listingId: l.listingId,
        title: l.title,
        category: l.category,
        from: before.price,
        to: l.price,
        changePct: round2(((l.price - before.price) / before.price) * 100),
      });
    }
  }

  const changedCount = newListings.length + goneListings.length + priceChanges.length;
  const baseline = Math.max(previous?.length ?? 0, current.length, 1);

  return {
    currency: current[0]?.currency ?? "USD",
    totalListings: current.length,
    previousTotalListings: previous ? previous.length : null,
    newListings,
    goneListings,
    priceChanges,
    categories: categoryStats(current),
    changedCount,
    activity: labelActivity(changedCount, baseline, previous === null),
  };
}
