// Reads the existing eBay cache (read-only) and manages the guide's own ebay_snapshots table.
// Relative imports so the pipeline also runs under ts-node, which doesn't resolve "@/".
import type { EbayItem, EbaySnapshot, Prisma } from "@prisma/client";
import { prisma } from "../../app/services/prisma";
import { slugToIdMap } from "../../app/services/movies";
import type { ListingSet, SnapshotListing } from "../types";

export type FilmCache = {
  movieId: string;
  slug: string;
  title: string;
  year: string;
  sourceUpdatedAt: Date; // EbayQuery.updatedAt: changes only when the site refetched from eBay
  listings: SnapshotListing[];
};

function listingIdFromUrl(url: string): string {
  return url.match(/\/itm\/(\d+)/)?.[1] ?? url.split("?")[0];
}

function toListing(item: EbayItem): SnapshotListing {
  return {
    listingId: listingIdFromUrl(item.itemUrl),
    title: item.title,
    category: item.category ?? "Other",
    price: parseFloat(item.priceValue),
    currency: item.priceCurrency,
    url: item.itemUrl,
  };
}

// Returns null when the film has no eBay cache yet (nobody has opened its page).
export async function readEbayCache(slug: string): Promise<FilmCache | null> {
  const tmdbId = slugToIdMap[slug];
  if (!tmdbId) throw new Error(`Unknown movie slug "${slug}"`);

  const movie = await prisma.movie.findUnique({
    where: { tmdbId },
    select: { id: true, title: true, releaseDate: true, ebayQuery: { include: { items: true } } },
  });
  const cache = movie?.ebayQuery;
  if (!movie || !cache || cache.items.length === 0) return null;

  // Same listing can appear twice if two searches matched it; keep the first.
  const byId = new Map<string, SnapshotListing>();
  for (const listing of cache.items.map(toListing)) {
    if (!Number.isNaN(listing.price) && !byId.has(listing.listingId)) {
      byId.set(listing.listingId, listing);
    }
  }

  return {
    movieId: movie.id,
    slug,
    title: movie.title,
    year: movie.releaseDate?.slice(0, 4) ?? "",
    sourceUpdatedAt: cache.updatedAt,
    listings: [...byId.values()],
  };
}

export async function getLatestSnapshot(movieId: string): Promise<EbaySnapshot | null> {
  return prisma.ebaySnapshot.findFirst({
    where: { movieId },
    orderBy: { createdAt: "desc" },
  });
}

// All kept snapshots of one film, oldest first — the history trends are computed from.
export async function getSnapshots(movieId: string): Promise<EbaySnapshot[]> {
  return prisma.ebaySnapshot.findMany({
    where: { movieId },
    orderBy: { createdAt: "asc" },
  });
}

export function snapshotListings(snapshot: EbaySnapshot): SnapshotListing[] {
  return snapshot.listings as unknown as SnapshotListing[];
}

export function toListingSet(snapshot: EbaySnapshot): ListingSet {
  return { takenAt: snapshot.createdAt, listings: snapshotListings(snapshot) };
}

export async function saveSnapshot(cache: FilmCache): Promise<EbaySnapshot> {
  return prisma.ebaySnapshot.create({
    data: {
      movieId: cache.movieId,
      slug: cache.slug,
      sourceUpdatedAt: cache.sourceUpdatedAt,
      listings: cache.listings as Prisma.InputJsonValue,
    },
  });
}

// Deletes one film's snapshots older than `retentionDays`, always keeping its newest one
// (it is what the next run compares against). Returns how many were deleted.
export async function pruneSnapshots(movieId: string, retentionDays: number): Promise<number> {
  const newest = await getLatestSnapshot(movieId);
  if (!newest) return 0;

  const { count } = await prisma.ebaySnapshot.deleteMany({
    where: {
      movieId,
      id: { not: newest.id },
      createdAt: { lt: new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000) },
    },
  });
  return count;
}
