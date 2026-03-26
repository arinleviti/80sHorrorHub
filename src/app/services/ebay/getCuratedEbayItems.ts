import { getEbayItems, EbayItemSummary, EbaySearchResponse, getEbayAccessToken } from "./getEbayItems";
import { prisma } from "../prisma";

// Build different search queries for eBay
export function buildEbayQueries(movieTitle: string, year: string): string[] {
  return [
    `${movieTitle} ${year} poster vintage`,
    `${movieTitle} ${year} VHS original`,
    `${movieTitle} ${year} collectible`,
    `${movieTitle} ${year} memorabilia`,
    `${movieTitle} ${year} action figure`,
  ];
}

// Filter items that are "cool"
export function isCoolItem(item: EbayItemSummary): boolean {
  const title = item.title.toLowerCase();
  return (
    title.includes("vintage") ||
    title.includes("original") ||
    title.includes("rare") ||
    title.includes("1980s") ||
    title.includes("collector") ||
    title.includes("limited")
  );
}

// Deduplicate by item URL
function dedupeItems(items: EbayItemSummary[]): EbayItemSummary[] {
  return Array.from(new Map(items.map(i => [i.itemAffiliateWebUrl, i])).values());
}

// Shuffle array
function shuffle<T>(array: T[]): T[] {
  return array.sort(() => Math.random() - 0.5);
}

export async function getCuratedEbayItems(
  movieId: string,
  movieTitle: string,
  year: string
): Promise<EbayItemSummary[]> {
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

  // 1️⃣ Check cached data first
  const cached = await prisma.ebayQuery.findUnique({
    where: { movieId },
    include: { items: true },
  });

  if (cached && Date.now() - cached.updatedAt.getTime() < TWELVE_HOURS_MS) {
    console.log(`📦 Using cached eBay data for movie ID: "${movieId}" (${cached.items.length} items)`);
    return cached.items.map(i => ({
      title: i.title,
      price: { value: i.priceValue, currency: i.priceCurrency },
      image: { imageUrl: i.imageUrl },
      itemAffiliateWebUrl: i.itemUrl
    }));
  }

  // 2️⃣ Fetch fresh data from eBay
  const queries = buildEbayQueries(movieTitle, year);
  const accessToken = await getEbayAccessToken();

  const results: EbaySearchResponse[] = await Promise.all(
    queries.map(q => getEbayItems(q, accessToken))
  );

  const merged = results.flatMap(r => r.itemSummaries);
  const unique = dedupeItems(merged);
  const curated = unique.filter(isCoolItem);
  const final = shuffle(curated).slice(0, 8);

  // 3️⃣ Upsert into DB
  await prisma.ebayQuery.upsert({
    where: { movieId },
    create: {
      movieId,
      items: {
        create: final.map(i => ({
          title: i.title,
          priceValue: i.price.value,
          priceCurrency: i.price.currency,
          imageUrl: i.image.imageUrl,
          itemUrl: i.itemAffiliateWebUrl
        }))
      }
    },
    update: {
      updatedAt: new Date(),
      items: {
        deleteMany: {},
        create: final.map(i => ({
          title: i.title,
          priceValue: i.price.value,
          priceCurrency: i.price.currency,
          imageUrl: i.image.imageUrl,
          itemUrl: i.itemAffiliateWebUrl
        }))
      }
    }
  });

  return final;
}