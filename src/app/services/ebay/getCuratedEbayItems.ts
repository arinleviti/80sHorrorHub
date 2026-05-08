import { getEbayItems, EbayItemSummary, EbaySearchResponse, getEbayAccessToken } from "./getEbayItems";
import { prisma } from "../prisma";

// ─── Per-movie Override Config ─────────────────────────────────────────────────
//
// For ultra-generic single-word titles ("The Being", "Pieces", "The Hunger"),
// eBay returns massive noise because the title word is a common English noun.
// Add entries here to require at least one of the listed keywords in the item
// title — otherwise the item is hard-filtered regardless of score.
//
// Keys are lowercase movie titles exactly as stored in your DB.
//
export const MOVIE_REQUIRED_KEYWORDS: Record<string, string[]> = {
  /* "the being": ["horror", "slasher", "film", "vhs", "dvd", "rare", "lobby"],
  "pieces": ["horror", "slasher", "vestron", "vhs", "dvd", "htf", "cult", "film", "juan piquer simon", "Juan Piquer Simón", "lobby"],
  "the hunger": ["horror", "bowie", "deneuve", "vhs", "dvd", "sarandon", "film", "lobby"],
  "parasite": ["demi moore", "3-d", "3d", "vhs", "dvd", "horror", "lobby"],
  "demons": ["argento", "bava", "lamberto", "horror", "vhs", "dvd", "dario", "lobby"],
  "prey": ["horror", "film",  "1978", "1977", "lobby"],
  "the stuff": ["larry cohen",  "film", "horror", "vhs", "dvd", "lobby"],
  "inferno": ["dario argento", "horror", "giallo", "vhs", "dvd",  "film", "lobby"],
  "dolls": ["horror", "film", "vhs", "dvd", "stuart gordon", "cult", "lobby"],
  "society": ["brian yuzna", "horror", "film","movie"],
  "mothers-day": ["charles kaufman", "horror", "film", "vhs", "dvd", "cult", "troma", "rare", "cult", "1980", "lobby"],
  "alligator": ["poster", "vhs", "lobby", "press", "laserdisc"],
  "graduation day": ["horror", "film", "vhs", "dvd", "cult", "Herb Freed", "lobby"],
  "house": ["horror", "film", "vhs", "dvd", "cult", "Steve Miner", "lobby"],
  "shocker": ["horror", "film", "vhs", "dvd", "cult", "lobby", "Wes Craven", "poster", "lobby"] */
  // Add more as you encounter noisy titles
};

// ─── High-Value Bonus Signals ──────────────────────────────────────────────────
//
// Keywords that indicate a genuinely rare, one-of-a-kind item (screen-used props,
// signed costumes, production wardrobe, etc.). Used exclusively in the bonus pass
// that APPENDS items after the main curation — never affects existing results.
//
export const HIGH_VALUE_SIGNALS = new Set([
  "signed", "autograph", "screen used", "screen worn", "production used",
  "hero prop", "film prop", "movie prop", "worn by", "wardrobe", "costume",
  "hand prop", "prop used", "grail", "holy grail", "one of a kind",
  "display piece", "from the set", "production item",
]);

// ─── Query Builder ─────────────────────────────────────────────────────────────
/* 
export function buildEbayQueries(movieTitle: string, year: string): string[] {
  return [
    `${movieTitle} ${year} poster original movie`,
    `${movieTitle} ${year} VHS original first release`,
    `${movieTitle} ${year} (betamax,super 8,laserdisc)`,
    `${movieTitle} ${year} (press kit,lobby card)`,
    `${movieTitle} ${year} (fotobusta,daybill)`,
   
  ];
}
 */
export function buildEbayQueries(movieTitle: string, year: string): string[] {
  return [
    `${movieTitle} ${year} poster original movie`,
    `${movieTitle} ${year} VHS original first release`,
    `${movieTitle} ${year} lobby card`,
    `${movieTitle} ${year} press kit`,
    `${movieTitle} ${year} pressbook`,
    `${movieTitle} ${year} betamax`,
    `${movieTitle} ${year} laserdisc`,
    `${movieTitle} ${year} fotobusta`,
    `${movieTitle} ${year} daybill`,
    `${movieTitle} ${year} movie action figure`,
  ];
}
// ─── Type Detection ────────────────────────────────────────────────────────────

type ItemType =
  | "physical_media"
  | "print"
  | "promo"
  | "toy"
  | "apparel"
  | "prop"
  | "home_media"
  | "junk"
  | "press_kit"
  | "lobby_card"
  | "unknown";

function detectItemType(title: string): ItemType {
  title = title.toLowerCase();
  if (title.includes("vhs") || title.includes("laserdisc") || title.includes("beta") || title.includes("laser disc")) return "physical_media";
  if (title.includes("press kit") || title.includes("pressbook") || title.includes("press book") || title.includes("movie program") || title.includes("film program")) return "press_kit";
  if (title.includes("press photo") || title.includes("press photograph")) return "promo";
  if (
    title.includes("lobby card") ||
    title.includes("lobby cards") ||
    title.includes("fotobusta") ||
    title.includes("fotobuste")
  ) return "lobby_card";
  if (
    title.includes("poster") ||
    title.includes("magazine") ||
    title.includes("fangoria") ||
    title.includes("daybill")
  ) return "print";
  if (title.includes("promo") || title.includes("screener")) return "promo";
  if (title.includes("figure") || title.includes("toy")) return "toy";
  if (title.includes("shirt") || title.includes("jacket") || title.includes("tee")) return "apparel";
  if (title.includes("prop") || title.includes("mask")) return "prop";
  if (title.includes("dvd") || title.includes("blu-ray")) return "home_media";
  if (title.includes("digital")) return "junk";
  return "unknown";
}

function getBaseScore(type: ItemType): number {
  switch (type) {
    case "press_kit":
    case "lobby_card":
    case "promo": return 5;
    case "physical_media": return 4;
    case "print": return 3;
    case "prop": return 3;
    case "toy":
    case "apparel": return 2;
    case "home_media": return -2;
    case "junk": return -3;
    default: return 1;
  }
}

// ─── Sequel / Franchise Helpers ────────────────────────────────────────────────

const ROMAN_TO_INT: Record<string, number> = {
  ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
};

// Reverse map: integer → roman numeral string
const INT_TO_ROMAN: Record<number, string> = Object.fromEntries(
  Object.entries(ROMAN_TO_INT).map(([roman, n]) => [n, roman])
);

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extracts a sequel number using general heuristics (no franchise anchor).
 * Used on the *target* movie title ("Halloween 5" → 5, "Hills Have Eyes Part 2" → 2).
 *
 * Capped at 8 to avoid matching "Friday the 13th" (13 > 8 → null = original film).
 */
function extractSequelNumber(title: string): number | null {
  const lower = title.toLowerCase();

  // "Part N" — most unambiguous
  const partMatch = lower.match(/\bpart\s+(\d+)\b/);
  if (partMatch) return parseInt(partMatch[1]);

  // Roman numerals as standalone words
  for (const [roman, val] of Object.entries(ROMAN_TO_INT)) {
    if (new RegExp(`\\b${roman}\\b`).test(lower)) return val;
  }

  // Any arabic digit 2–8 anywhere in the title
  const anyMatch = lower.match(/\b([2-8])\b/);
  if (anyMatch) return parseInt(anyMatch[1]);

  return null;
}

/**
 * Words that signal a number is a COUNT, not a sequel identifier.
 * Covers "8 Original French Lobby Cards", "6 B&W Stills", "4 Photos", etc.
 */
const COUNT_WORD_PATTERN = /^(french|italian|spanish|german|japanese|thai|greek|turkish|czech|belgian|dutch|yugoslavian|australian|british|polish|lobby|stills?|photos?|sets?|pieces?|cards?|glossy)\b/i;

/**
 * Extracts the sequel number from an *item* title using the franchise base
 * as an anchor. This handles two problems the trailing-digit approach misses:
 *
 * Problem 1 — Mid-title sequel numbers:
 *   "Halloween 4 The Return of Michael Myers RARE VHS" — "4" is NOT at the end,
 *   so the trailing regex returns null and the sequel filter silently breaks.
 *   Using the franchise anchor, we match "halloween 4" directly.
 *
 * Problem 2 — Count vs. sequel disambiguation:
 *   "Maniac Cop 2 8 Original French Lobby Cards" — after "maniac cop" we see "2"
 *   followed by another digit "8" (sequel + count pattern) → return 2.
 *   "Demons 8 Original French Lobby Cards" — after "demons" we see "8" followed
 *   by "original" (a count word) → 8 is a quantity, not a sequel → return null.
 */
function extractSequelFromItem(itemTitle: string, franchiseBase: string): number | null {
  const itemLower = itemTitle.toLowerCase();
  const baseLower = franchiseBase.toLowerCase().replace(/^(a|an|the)\s+/, "");

  // Primary: find a digit immediately after the franchise base name
  const pattern = new RegExp(`${escapeRegex(baseLower)}\\s+(\\d+)(?:\\s+(\\S+))?`);
  const match = itemLower.match(pattern);

  if (match) {
    const n = parseInt(match[1]);
    if (n >= 2 && n <= 8) {
      const nextToken = match[2] || "";
      // Next token is another digit → sequel + count pattern (e.g. "Cop 2 8 Original…")
      if (/^\d+$/.test(nextToken)) return n;
      // Next token is a count word → this number is a quantity, not a sequel
      if (COUNT_WORD_PATTERN.test(nextToken)) return null;
      // Any other token (colon, word, punctuation) → treat as sequel identifier
      return n;
    }
  }

  // Fallback: general extraction handles "Part N" and roman numerals
  // that don't immediately follow the franchise name
  return extractSequelNumber(itemTitle);
}

/**
 * Strips sequel identifiers to get the canonical franchise base name.
 * "Halloween 5"              → "halloween"
 * "Hills Have Eyes Part 2"   → "hills have eyes"
 * "Halloween II"             → "halloween"
 */
function getFranchiseBase(title: string): string {
  return title
    .toLowerCase()
    .replace(/\bpart\s+\d+\b.*$/g, "")
    .replace(new RegExp(`\\b(${Object.keys(ROMAN_TO_INT).join("|")})\\b.*$`, "g"), "")
    .replace(/\b[2-8]\b.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Scoring Helpers ───────────────────────────────────────────────────────────

/**
 * Year mismatch scoring.
 *
 * Escalating penalty the further the item's year is from the target.
 * Complemented by the hard discard in isBadItem() for >12-year gaps.
 *
 * Kills: "Parasite (2004)" for 1982, "Hills Have Eyes 2006" for 1985,
 *        "Child's Play 1972" for 1988, remake lobby cards, etc.
 */
function getYearScore(itemTitle: string, movieYear: string): number {
  const target = parseInt(movieYear);
  const years = [...itemTitle.matchAll(/\b(19[5-9]\d|20[0-2]\d)\b/g)].map(m => parseInt(m[1]));
  if (years.length === 0) return 0;

  const minDiff = Math.min(...years.map(y => Math.abs(y - target)));

  if (minDiff === 0) return 3;   // exact year match
  if (minDiff <= 2) return 1;   // release/distribution lag
  if (minDiff <= 8) return -4;   // different era
  return -10;                      // near-disqualifying
}
function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/\b\d+x\d+\b/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
/**
 * Franchise contamination scoring.
 *
 * Numbered entry (Halloween 5): wrong entries score −10, correct entry +1.
 * Original film (no number): any sequel entry scores −9.
 */
function getSequelScore(itemTitle: string, movieTitle: string): number {
  const targetSequel = extractSequelNumber(movieTitle);
  const franchiseBase = getFranchiseBase(movieTitle);
  const itemLower = itemTitle.toLowerCase();

  // Only apply if the item mentions the franchise at all
  const franchiseWords = franchiseBase.split(" ").filter(w => w.length > 3);
  const mentionsFranchise = franchiseWords.some(w => itemLower.includes(w));
  if (!mentionsFranchise) return 0;

  let itemSequel = extractSequelFromItem(itemTitle, franchiseBase);

  // Roman ↔ Arabic equivalence fallback.
  //
  // extractSequelFromItem can return null in two legitimate situations:
  //   (a) there genuinely is no sequel number in the item title
  //   (b) the COUNT_WORD heuristic fired ("2 Original Lobby Cards") and
  //       suppressed what is actually a sequel number
  //
  // To recover from (b), we explicitly check whether the *target* sequel
  // number appears in the item title in either its arabic or roman form.
  // If found, we treat it as a confirmed match — not a count.
  //
  // Examples this fixes:
  //   target "Halloween II" (2) + item "Halloween 2 Original Lobby Cards"
  //     → "2" found as standalone word → itemSequel = 2 → +1 bonus ✓
  //   target "Maniac Cop 2" + item "Maniac Cop II 8 Original French Lobby Cards"
  //     → "ii" found as standalone word → itemSequel = 2 → +1 bonus ✓
  if (itemSequel === null && targetSequel !== null) {
    const romanForm = INT_TO_ROMAN[targetSequel]; // e.g. 2 → "ii"
    const arabicRx = new RegExp(`\\b${targetSequel}\\b`);
    const romanRx = romanForm ? new RegExp(`\\b${romanForm}\\b`) : null;
    if (arabicRx.test(itemLower) || romanRx?.test(itemLower)) {
      itemSequel = targetSequel;
    }
  }

  if (targetSequel === null) {
    // Original film — any identifiable sequel is contamination
    if (itemSequel !== null && itemSequel >= 2) return -9;
    return 0;
  }

  if (itemSequel === null) return 0;            // no sequel number → generic franchise merch
  if (itemSequel !== targetSequel) return -10;  // wrong numbered entry
  return 1;                                     // correct numbered entry confirmed
}

/**
 * Title relevance scoring.
 *
 * Measures how many of the movie's significant words appear in the item title.
 * Primary defence against generic-word noise.
 *
 * The −15 for zero match is intentionally strong: even an item stacked with
 * vintage + rare + original + signed bonuses (~+13) cannot survive without
 * the film title being present. Kills "KISS Gene Simmons 1985 Poster" for
 * "Demons", MOTU figures for "Parasite", Reese's Pieces ads for "Pieces", etc.
 */
function getTitleRelevanceScore(itemTitle: string, movieTitle: string): number {
  const stopWords = new Set(["the", "a", "an", "of", "in", "on", "at", "to", "for", "and", "or"]);
  const itemLower = itemTitle.toLowerCase();

  const movieWords = movieTitle
    .toLowerCase()
    .split(/\s+/)
    .filter(w => !stopWords.has(w) && w.length > 2);

  if (movieWords.length === 0) return 0;

  /* const matchCount = movieWords.filter(w => itemLower.includes(w)).length; */
  const matchCount = movieWords.filter(w => {
    const regex = new RegExp(`\\b${w}\\b`, "i");
    return regex.test(itemTitle);
  }).length;
  const ratio = matchCount / movieWords.length;

  if (ratio >= 0.8) return 3;
  if (ratio >= 0.5) return 0;
  if (ratio >= 0.25) return -5;
  return -15;  // title essentially absent → disqualifying
}

// ─── Main Scorer ───────────────────────────────────────────────────────────────

function scoreItem(item: EbayItemSummary, movieTitle: string, movieYear: string): number {
  const title = item.title.toLowerCase();
  const type = detectItemType(title);
  let score = getBaseScore(type);

  // Keyword bonuses
  if (title.includes("original")) score += 5;
  if (title.includes("vintage")) score += 3;
  if (title.includes("rare")) score += 4;
  if (title.includes("first release")) score += 2;
  if (title.includes("screener")) score += 2;
  if (title.includes("promo")) score += 2;
  if (title.includes("signed") || title.includes("autograph")) score += 4;
  if (title.includes("screen used") || title.includes("screen worn")) score += 5;
  if (title.includes("sealed") || title.includes("shrink")) score += 3;
  if (title.includes("big box") || title.includes("clamshell")) score += 3;
  if (title.includes("one sheet") || title.includes("one-sheet")) score += 3;
  if (title.includes("daybill") || title.includes("fotobusta") || title.includes("fotobuste")) score += 3;
  if (title.includes("crew")) score += 2;
  if (title.includes("cast")) score += 1;
  if (title.includes("insert") && type === "print") score += 2;

  // Keyword penalties
  if (title.includes("reprint")) score -= 3;
  if (title.includes("replica")) score -= 6;
  if (title.includes("reproduction") || title.includes("repro")) score -= 4;

  // Context-aware scoring
  score += getYearScore(title, movieYear);
  score += getSequelScore(title, movieTitle);
  score += getTitleRelevanceScore(title, movieTitle);

  return score;
}

// ─── Hard Filters ──────────────────────────────────────────────────────────────

/**
 * Returns true for items that must always be discarded regardless of score.
 *
 * Hard year filter: if every explicit year in the item title is >12 years away
 * from the target, discard unconditionally. Catches remakes, different-decade
 * films with the same name, and obviously wrong results.
 *
 * Per-movie required keyword filter: for ultra-generic single-word titles
 * ("The Being", "Pieces", "Demons"), require at least one of the configured
 * keywords to be present. Without this, algorithmically indistinguishable
 * false positives (Reese's Pieces ads, Being John Malkovich, KISS posters)
 * would rank above legitimate results.
 */
function isBadItem(title: string, movieTitle: string, movieYear: string, price?: number): boolean {
  const lower = title.toLowerCase();

  if (lower.includes("poster") && lower.includes("print") && !lower.includes("misprint")) return true;
  if (lower.includes("borderless")) return true;
  if (lower.includes("fan art")) return true;
  if (lower.includes("art print")) return true;
  if (lower.includes("anniversary")) return true;
  if (lower.includes("bootleg")) return true;
  if (lower.includes("digital code")) return true;
  if (lower.includes("digital download")) return true;
  if (lower.includes("print on demand")) return true;
  if (lower.includes("wall decor")) return true;
  if (lower.includes("mondo")) return true;

  const hasAuthenticity =
    lower.includes("original") ||
    lower.includes("orig") ||
    lower.includes("vintage") ||
    lower.includes("rare") ||
    lower.includes("one sheet") ||
    lower.includes("one-sheet") ||
    lower.includes("daybill") ||
    lower.includes("fotobusta");

  if (!hasAuthenticity && lower.includes("poster")) {
    if (/\b(11\s*x\s*17|24\s*x\s*36|18\s*x\s*24|12\s*x\s*18)\b/i.test(lower)) return true;
  }

  // Hard year filter
  const years = [...lower.matchAll(/\b(19[5-9]\d|20[0-2]\d)\b/g)].map(m => parseInt(m[1]));
  const target = parseInt(movieYear);
  if (years.length > 0 && Math.min(...years.map(y => Math.abs(y - target))) > 12) return true;

  // Hard franchise sequel filter
  const targetSequel = extractSequelNumber(movieTitle);
  const franchiseBase = getFranchiseBase(movieTitle).toLowerCase().replace(/^(a|an|the)\s+/, "");
  const franchiseWords = franchiseBase.split(" ").filter(w => w.length > 3);
  const mentionsFranchise = franchiseWords.some(w => lower.includes(w));

  if (mentionsFranchise && targetSequel !== null) {
    const itemSequel = extractSequelFromItem(lower, franchiseBase);
    if (itemSequel !== null && itemSequel !== targetSequel) return true;
    if (itemSequel === null) return true;
  }
  // Hard filter for original film pages — kill any item with a sequel number
  if (mentionsFranchise && targetSequel === null) {
    const itemSequel = extractSequelFromItem(lower, franchiseBase);
    if (itemSequel !== null && itemSequel >= 2) return true;
  }
  // Per-movie required keyword filter
  const requiredKeywords = MOVIE_REQUIRED_KEYWORDS[movieTitle.toLowerCase()];
  if (requiredKeywords?.length) {
    const hasRequiredKeyword = requiredKeywords.some(kw => lower.includes(kw));
    if (!hasRequiredKeyword) return true;
  }
  // Cheap poster with no authenticity signals = almost certainly a reprint
  const isPrint = detectItemType(lower) === "print";
  if (isPrint && !hasAuthenticity && price !== undefined && price < 30) return true;
  return false;
}

function dedupeItems(items: EbayItemSummary[]): EbayItemSummary[] {
  return Array.from(new Map(items.map(i => [i.itemAffiliateWebUrl, i])).values());
}

function shuffle<T>(array: T[]): T[] {
  return array.sort(() => Math.random() - 0.5);
}

// ─── Main Export ───────────────────────────────────────────────────────────────

export async function getCuratedEbayItems(
  movieId: string,
  movieTitle: string,
  year: string
): Promise<EbayItemSummary[]> {
  const CACHE_TTL_MS_10M = 10 * 60 * 1000; // 10 minutes
  const CACHE_TTL_MS_12H = 12 * 60 * 60 * 1000; // 12 hours
  const now = new Date();

  // 1️⃣ Check cache
  const cached = await prisma.ebayQuery.findUnique({
    where: { movieId },
    include: { items: true },
  });

  let useCache = false;
  if (cached) {
    const hasExpiredItem = cached.items.some(i => i.listingEndDate && i.listingEndDate <= now);
    if (!hasExpiredItem && Date.now() - cached.updatedAt.getTime() < CACHE_TTL_MS_12H) {
      useCache = true;
    }
  }

  if (useCache) {
    console.log(`📦 Using cached eBay data for movie ID: "${movieId}" (${cached!.items.length} items)`);
    return cached!.items.map(i => ({
      title: i.title,
      price: { value: i.priceValue, currency: i.priceCurrency },
      image: { imageUrl: i.imageUrl },
      itemAffiliateWebUrl: i.itemUrl,
    }));
  }

  // 2️⃣ Fetch fresh data
  const queries = buildEbayQueries(movieTitle, year);
  const accessToken = await getEbayAccessToken();

  if (!accessToken) {
    console.error("🚨🚨 EBAY TOKEN FAILURE — FALLING BACK TO CACHE");
    return getStaleCache(movieId);
  }
  let results: EbaySearchResponse[];
  try {
    results = await Promise.all(
      queries.map(async (q) => {
        const result = await getEbayItems(q, accessToken);
        console.log(`🔍 "${q}" → ${result.itemSummaries.length} items`);
        return result;
      })
    );
  } catch (err) {
    /* try {
      results = await Promise.all(
        queries.map(q => getEbayItems(q, accessToken))
        
      );
    } catch (err) { */
    console.error("🚨🚨 EBAY API FETCH FAILED — USING STALE CACHE", err);
    return getStaleCache(movieId);
  }
  // results = [{ itemSummaries: [A, B] },{ itemSummaries: [C, D] }] with map:[[A, B], [C, D]], with flatmap: [A, B, C, D]
  const merged = results.flatMap(r => r.itemSummaries);

  // Filter expired listings
  const availableItems = merged.filter(
    item => !item.listing?.endDate || new Date(item.listing.endDate) > now
  );

  // Deduplicate
  const unique = dedupeItems(availableItems);
  console.log(`📦 Raw merged: ${merged.length}`);
  console.log(`✅ After dedup: ${unique.length}`);
  // Hard filter → score → soft filter
  const scored = unique
    .filter(item => !isBadItem(item.title, movieTitle, year, parseFloat(item.price.value)))
    .map(item => ({ item, score: scoreItem(item, movieTitle, year) }))
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();

  const dedupedScored = scored.filter(({ item }) => {
    const key = normalizeTitle(item.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const typeLimits: Record<ItemType, number> = {
    physical_media: 6,
    print: 8,
    lobby_card: 6,
    press_kit: 4,
    promo: 4,
    toy: 3,
    apparel: 3,
    prop: 3,
    home_media: 0,
    junk: 0,
    unknown: 4,
  };

  const typeCounts: Record<ItemType, number> = {} as Record<ItemType, number>;
  const curated: EbayItemSummary[] = [];

  // collect up to 15 items freely, then keep going up to 30 only if the next item scores 8 or above.
  //  Anything below 8 after position 15 stops the loop.
  const MIN_SCORE = 3;
  const HIGH_SCORE = 8;
  const MAX_ITEMS = 30;

  let midTierCount = 0;
  const MID_TIER_LIMIT = 5;

  for (const { item, score } of dedupedScored) {
    if (score < MIN_SCORE) continue;

    if (curated.length >= 15) {
      if (score >= HIGH_SCORE) {
        // good → always allow
      } else {
        if (midTierCount >= MID_TIER_LIMIT) continue;
        midTierCount++;
      }
    }

    if (curated.length >= MAX_ITEMS) break;

    const type = detectItemType(item.title.toLowerCase());

    if (type === "unknown" && score >= 8) {
      curated.push(item);
      continue;
    }

    if ((typeCounts[type] || 0) < (typeLimits[type] || 1)) {
      curated.push(item);
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }
  }

  const final = shuffle(curated);

  // ─── Bonus Pass: High-Value Unknowns ────────────────────────────────────────
  // Catches signed/screen-used/prop/wardrobe items that score too low for the
  // main curation loop but are genuinely rare and valuable.
  //
  // Rules:
  //   • Item must NOT already be in `final` (checked by affiliate URL)
  //   • Item must have typed as "unknown" by detectItemType
  //   • Listed price must be ≥ $500
  //   • Title must contain at least one HIGH_VALUE_SIGNALS keyword
  //   • Capped at 3 bonus items
  //   • Appended AFTER `final` — never displaces anything already collected
  // ────────────────────────────────────────────────────────────────────────────
  const collectedUrls = new Set(final.map(i => i.itemAffiliateWebUrl));

  const bonusItems = dedupedScored
    .filter(({ item }) => {
      if (collectedUrls.has(item.itemAffiliateWebUrl)) return false;
      const type = detectItemType(item.title.toLowerCase());
      if (type !== "unknown") return false;
      const price = parseFloat(item.price.value);
      if (price < 500) return false;
      const lower = item.title.toLowerCase();
      return [...HIGH_VALUE_SIGNALS].some(kw => lower.includes(kw));
    })
    .slice(0, 3)
    .map(({ item }) => item);

  const finalWithBonus = [...final, ...bonusItems];

  console.log(`🏆 Final curated: ${final.length} | 💎 Bonus high-value: ${bonusItems.length}`);

  // 3️⃣ Upsert into DB
  await prisma.ebayQuery.upsert({
    where: { movieId },
    create: {
      movieId,
      items: {
        create: finalWithBonus.map(i => ({
          title: i.title,
          priceValue: i.price.value,
          priceCurrency: i.price.currency,
          imageUrl: i.image.imageUrl,
          itemUrl: i.itemAffiliateWebUrl,
          listingEndDate: i.listing?.endDate ? new Date(i.listing.endDate) : null,
        })),
      },
    },
    update: {
      updatedAt: new Date(),
      items: {
        deleteMany: {},
        create: finalWithBonus.map(i => ({
          title: i.title,
          priceValue: i.price.value,
          priceCurrency: i.price.currency,
          imageUrl: i.image.imageUrl,
          itemUrl: i.itemAffiliateWebUrl,
          listingEndDate: i.listing?.endDate ? new Date(i.listing.endDate) : null,
        })),
      },
    },
  });

  return finalWithBonus;
}

// ─────────────────────────────────────────────
// 🚨 STALE CACHE FALLBACK (NEW)
// ─────────────────────────────────────────────

async function getStaleCache(movieId: string) {
  const cached = await prisma.ebayQuery.findUnique({
    where: { movieId },
    include: { items: true },
  });

  if (!cached?.items?.length) {
    console.error("❌ NO STALE CACHE AVAILABLE");
    return [];
  }

  console.warn("🚨🚨🚨🚨 USING STALE EBAY CACHE (API FAILURE MODE) 🚨🚨🚨🚨");

  return cached.items.map(i => ({
    title: i.title,
    price: { value: i.priceValue, currency: i.priceCurrency },
    image: { imageUrl: i.imageUrl },
    itemAffiliateWebUrl: i.itemUrl,
  }));
}