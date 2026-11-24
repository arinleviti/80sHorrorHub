// One eBay listing as stored in ebay_snapshots.listings.
// (A type alias, not an interface, so Prisma accepts it as JSON.)
export type SnapshotListing = {
  listingId: string; // eBay item number, taken from the listing URL
  title: string;
  category: string;
  price: number;
  currency: string;
  url: string;
};

// Movement labels come from fixed rules in facts.ts — the LLM never decides them.
export type Activity =
  | "first snapshot"
  | "no change"
  | "no meaningful change"
  | "moderate activity"
  | "high activity";

export type PriceChange = {
  listingId: string;
  title: string;
  category: string;
  from: number;
  to: number;
  changePct: number;
};

export type CategoryStats = {
  category: string;
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  cheapest: { title: string; price: number; url: string };
};

// Everything the writer is allowed to say about the market, computed in code.
// "New" and "gone" are relative to the previous snapshot of our curated selection:
// a listing that disappeared may have ended or dropped out of the selection, not sold.
export type MarketFacts = {
  currency: string;
  totalListings: number;
  previousTotalListings: number | null;
  newListings: SnapshotListing[];
  goneListings: SnapshotListing[];
  priceChanges: PriceChange[];
  categories: CategoryStats[];
  changedCount: number;
  activity: Activity;
};
