// One eBay listing as stored in ebay_snapshots.listings.
// (A type alias, not an interface, so Prisma accepts it as JSON.)
// No URL: the long affiliate links were most of a snapshot's size and nothing needs them.
// Snapshots saved before this change still carry a `url` field, which is simply ignored.
export type SnapshotListing = {
  listingId: string; // eBay item number, taken from the listing URL
  title: string;
  category: string;
  price: number;
  currency: string;
};

// A set of listings at a point in time (a saved snapshot, or the current cache).
export type ListingSet = {
  takenAt: Date;
  listings: SnapshotListing[];
};

export type CategoryStats = {
  category: string;
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  cheapest: { title: string; price: number };
};

// Labels come from fixed rules in facts.ts — the LLM never decides them.
export type Turnover = "low turnover" | "moderate turnover" | "high turnover";
export type PriceDirection = "higher" | "lower" | "stable";

export type CategoryTrend = {
  category: string;
  countThen: number;
  countNow: number;
  avgThen: number;
  avgNow: number;
  changePct: number;
  direction: PriceDirection;
};

export type PriceChange = {
  title: string;
  category: string;
  from: number;
  to: number;
  changePct: number;
};

// Comparison of the current listings with the snapshot from about `days` ago.
// "New" and "gone" are relative to our curated selection: a gone listing may have ended
// or dropped out of the selection, not sold.
export type WindowFacts = {
  days: number;
  baselineDate: string; // YYYY-MM-DD of the snapshot compared against
  baselineAgeDays: number;
  totalThen: number;
  totalNow: number;
  newCount: number;
  goneCount: number;
  stillListedCount: number;
  turnoverPct: number;
  turnover: Turnover;
  categoryTrends: CategoryTrend[]; // only categories large enough to compare
  priceChanges: PriceChange[]; // listings present at both ends whose price changed
};

export type ListingAge = {
  title: string;
  category: string;
  price: number;
  firstSeen: string; // YYYY-MM-DD; "at least" since history starts at trackedSince
  ageDays: number;
};

// Everything the writer is allowed to say about the market, computed in code.
export type MarketFacts = {
  currency: string;
  totalListings: number;
  categories: CategoryStats[];
  trackedSince: string; // YYYY-MM-DD of the oldest snapshot kept for this film
  historyDays: number;
  week: WindowFacts | null; // null = not enough history yet
  month: WindowFacts | null;
  longListed: ListingAge[];
};
