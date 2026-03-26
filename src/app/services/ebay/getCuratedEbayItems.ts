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
    `${movieTitle} ${year} poster original theatrical`,
    `${movieTitle} ${year} VHS first release`,
    `${movieTitle} ${year} laserdisc`,
    `${movieTitle} ${year} press kit`,
    `${movieTitle} ${year} lobby card`,
    `${movieTitle} ${year} rare horror collectible`,
    `${movieTitle} ${year} screener tape`,
    `${movieTitle} ${year} promo`,
  ];
}
type ItemType =
  | "physical_media"   // VHS, Laserdisc
  | "print"           // posters, lobby cards, magazines
  | "promo"           // press kits, promo items
  | "toy"             // figures
  | "apparel"         // shirts, jackets
  | "prop"            // props, replicas
  | "home_media"      // dvd, bluray
  | "junk" 
  | "press_kit"
  | "lobby_card"           // digital, low-value
  | "unknown";

function detectItemType(title: string): ItemType {
  title = title.toLowerCase();
  if (title.includes("vhs") || title.includes("laserdisc")) return "physical_media";
  if (title.includes("poster") || title.includes("magazine")) return "print";
  if (title.includes("press kit")) return "press_kit";
  if (title.includes("lobby")) return "lobby_card";
  if (title.includes("promo") || title.includes("screener")) return "promo";
  if (title.includes("figure") || title.includes("toy")) return "toy";
  if (title.includes("shirt") || title.includes("jacket")) return "apparel";
  if (title.includes("prop")) return "prop";
  if (title.includes("dvd") || title.includes("blu-ray")) return "home_media";
  if (title.includes("digital")) return "junk";
  return "unknown";
}

// 3️⃣ Base scores for each type
function getBaseScore(type: ItemType): number {
  switch (type) {
    case "press_kit":
    case "lobby_card":
    case "promo":
      return 5;
    case "physical_media":
      return 4;
    case "print":
      return 3;
    case "toy":
    case "apparel":
    case "prop":
      return 2;
    case "home_media":
      return -2;
    case "junk":
      return -3;
    default:
      return 1; // unknown gets small baseline
  }
}

// 4️⃣ Score items using type + keyword signals
function scoreItem(item: EbayItemSummary): number {
  const title = item.title.toLowerCase();
  const type = detectItemType(title);
  let score = getBaseScore(type);

  // 🔥 collector signals
  if (title.includes("original")) score += 3;
  if (title.includes("vintage")) score += 3;
  if (title.includes("rare")) score += 3;
  if (title.includes("first release")) score += 2;

  // 🎯 niche goodies
  if (title.includes("screener")) score += 2;
  if (title.includes("promo")) score += 2;
  if (title.includes("signed") || title.includes("autograph")) score += 4;
  if (title.includes("screen used") || title.includes("screen worn")) score += 5;
  if (title.includes("crew")) score += 2;
  if (title.includes("cast")) score += 1;

  // ⚠️ soft penalties
  if (title.includes("reprint")) score -= 3;
  if (title.includes("replica")) score -= 3;

  return score;
}

// 5️⃣ Absolute junk filter
function isBadItem(title: string): boolean {
  title = title.toLowerCase();
  return (
    title.includes("fan art") ||
    title.includes("bootleg") ||
    title.includes("digital code")
  );
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

  const scored = unique.map(item => ({ item, score: scoreItem(item) }));

   // 3️⃣ Filter, enforce type limits, sort & limit to 15
  const typeLimits: Record<ItemType, number> = {
    physical_media: 3, // VHS / Laserdisc
    print: 2,          // Posters
    lobby_card: 3,
    press_kit: 2,
    promo: 2,
    toy: 2,
    apparel: 1,
    prop: 1,
    home_media: 0,
    junk: 0,
    unknown: 1,
  };

  const typeCounts: Record<ItemType, number> = {} as Record<ItemType, number>;
  const curated: EbayItemSummary[] = [];

  for (const { item, score } of scored.sort((a, b) => b.score - a.score)) {
    if (isBadItem(item.title)) continue;
    if (score <= 1) continue;

    const type = detectItemType(item.title);

    if ((typeCounts[type] || 0) < (typeLimits[type] || 1)) {
      curated.push(item);
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }

    if (curated.length >= 15) break;
  }

  const final = shuffle(curated);

 /*  const curated = unique.filter(isCoolItem);
  const final = shuffle(curated).slice(0, 15); */ // limit to 15 items

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