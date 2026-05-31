import { prisma } from "@/app/services/prisma";

const ONE_DAY_MS    = 1000 * 60 * 60 * 24;
const TEN_MINUTES_MS = 1000 * 60 * 10;
const ONE_WEEK_MS   = 1000 * 60 * 60 * 24 * 7;
const DISCOGS_KEY   = process.env.DISCOGS_KEY;

/* ================= TYPES ================= */

export interface RawResult {
  id?: number;
  title: string;
  year?: number | string;
  format?: string[];
  thumb?: string;
  uri: string;
  country?: string;
  type?: string;
}

export interface RawResponse {
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    items: number;
    urls: Record<string, string>;
  };
  results: RawResult[];
}

export interface ReturnedResult {
  title: string;
  year: number | null;
  format: string[];
  thumb?: string;
  uri: string;
}

/* ================= QUERIES ================= */

function buildDiscogsQueries(title: string, year: string, artists: string[]): string[] {
  const yearNum = Number(year);
  const queries: string[] = [];

  // Primary: title + year (±1) + strong OST keywords
  for (const y of [yearNum, yearNum - 1, yearNum + 1]) {
    queries.push(`${title} ${y} original motion picture soundtrack`);
    queries.push(`${title} ${y} soundtrack`);
  }

  // Title + keyword, no year constraint
  queries.push(`${title} original motion picture soundtrack`);
  queries.push(`${title} soundtrack`);
  queries.push(`${title} score`);

  // Artist-based queries
  for (const artist of artists) {
    queries.push(`${artist} ${title}`);
    queries.push(`${artist} soundtrack ${yearNum}`);
  }

  // Dedupe in case of overlapping combinations
  return [...new Set(queries)];
}

/* ================= MAIN FUNCTION ================= */

export async function fetchVynils(
  title: string,
  year: string,
  musicPeople: string[]
): Promise<ReturnedResult[] | null> {
  const cached = await getCachedVynils(title, year);
  if (cached) {
    console.log(`📦 Discogs cache hit for "${title} (${year})" → using DB`);
    return cached;
  }
  console.log(`🔍 Discogs cache miss for "${title} (${year})" → calling API`);

  try {
    const queries  = buildDiscogsQueries(title, year, musicPeople);
    const responses = await fetchAllQueries(queries);
    const merged   = responses.flatMap(r => r.results);
    const unique   = dedupeByTitleYearFormat(merged);

    const scored = unique
      .map(item => ({
        item,
        score: scoreDiscogs(item, Number(year), musicPeople),
      }))
      .filter(({ item, score }) =>
        score > 2 && isRelevantDiscogs(item, title, musicPeople)
      )
      .sort((a, b) => b.score - a.score);

    const curated: RawResult[]     = [];
    const seenTitles = new Set<string>();

    for (const { item } of scored) {
      const titleKey = item.title.toLowerCase();
      if (seenTitles.has(titleKey)) continue;
      curated.push(item);
      seenTitles.add(titleKey);
      if (curated.length >= 15) break;
    }

    if (curated.length === 0) return null;

    const returnedResults: ReturnedResult[] = curated.map(r => ({
      title:  r.title,
      year:   typeof r.year === "number" ? r.year : r.year ? parseInt(r.year, 10) : null,
      format: Array.isArray(r.format) ? r.format : [],
      thumb:  r.thumb,
      uri:    r.uri,
    }));

    await saveVynilsToDB(title, year, returnedResults);
    return returnedResults;
  } catch (err) {
    console.error("Discogs pipeline failed:", err);
    return null;
  }
}

/* ================= FETCH WITH CONCURRENCY LIMIT ================= */

async function fetchAllQueries(queries: string[]): Promise<RawResponse[]> {
  const CONCURRENCY = 4;
  const results: RawResponse[] = [];

  for (let i = 0; i < queries.length; i += CONCURRENCY) {
    const batch = queries.slice(i, i + CONCURRENCY);
    // allSettled so a single failed query doesn't abort the whole pipeline
    const settled = await Promise.allSettled(batch.map(fetchFromDiscogQuery));
    for (const result of settled) {
      if (result.status === "fulfilled") results.push(result.value);
      else console.warn("Discogs query failed:", result.reason);
    }
  }

  return results;
}

/* ================= FETCH SINGLE QUERY ================= */

async function fetchFromDiscogQuery(query: string): Promise<RawResponse> {
  const params = new URLSearchParams({
    q:        query,
    format:   "vinyl",
    type:     "release",
    per_page: "10",
  });

  if (DISCOGS_KEY) params.append("token", DISCOGS_KEY);

  const response = await fetch(
    `https://api.discogs.com/database/search?${params.toString()}`,
    { headers: { "User-Agent": "VintageHorror/1.0" },
    next: { revalidate: 3600 } // cache for 1 hour
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("Discogs request failed:", response.status, text.slice(0, 500));
    throw new Error(`Discogs request failed with status ${response.status}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    const text = await response.text();
    console.error("Failed to parse Discogs JSON:", text.slice(0, 500));
    throw new Error("Discogs returned invalid JSON");
  }

  if (!isRawResponse(data)) throw new Error("Invalid Discogs response shape");

  return data;
}

/* ================= FILTERING ================= */

const STOPWORDS = new Set([
  "the", "a", "an", "of", "in", "to", "and", "or",
  "for", "from", "at", "by", "with", "is", "it", "its",
]);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * phraseMatch  — the full movie title appears verbatim in the listing title.
 * wordRatio    — fraction of meaningful (non-stopword) movie words matched,
 *                using word boundaries so "fly" doesn't hit "Super Fly" and
 *                "the" doesn't count at all.
 */
function computeMovieMatch(
  itemTitle: string,
  movieTitle: string
): { phraseMatch: boolean; wordRatio: number; meaningfulWordCount: number } {
  const titleLower = itemTitle.toLowerCase();
  const movieLower = movieTitle.toLowerCase();

  const phraseMatch = titleLower.includes(movieLower);

  const meaningfulWords = movieLower
    .split(/\s+/)
    .filter(w => w.length > 0 && !STOPWORDS.has(w));

  if (meaningfulWords.length === 0) {
    return { phraseMatch, wordRatio: phraseMatch ? 1 : 0, meaningfulWordCount: 0 };
  }

  const matchCount = meaningfulWords.filter(w =>
    new RegExp(`\\b${escapeRegex(w)}\\b`).test(titleLower)
  ).length;

  return {
    phraseMatch,
    wordRatio: matchCount / meaningfulWords.length,
    meaningfulWordCount: meaningfulWords.length,
  };
}

/** True if the movie title itself ends with a number — e.g. "Halloween II" */
function titleContainsNumber(movieTitle: string): boolean {
  return /\s+(\d+|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV)\b/i.test(movieTitle);
}

/**
 * True if the Discogs listing title contains the movie title immediately
 * followed by an arabic number or roman numeral — e.g. "Elm Street 2" or "Elm Street II".
 * Handles separators like ":", "-", "–" between title and number.
 */
function hasSequelSuffix(listingTitle: string, movieTitle: string): boolean {
  const escaped = escapeRegex(movieTitle.toLowerCase());
  return new RegExp(
    `${escaped}\\s*[:\\-–]?\\s*(\\d+|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV)\\b`,
    "i"
  ).test(listingTitle);
}
const ROMAN_TO_NUM: Record<string, number> = {
  II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10, XI:11, XII:12,
};

function getSequelParts(movieTitle: string): { base: string; num: number } | null {
  const arabic = movieTitle.match(/^(.+?)\s+(\d+)(?:\s*[:\-–].*)?$/i);
  if (arabic) return { base: arabic[1].trim(), num: parseInt(arabic[2]) };

  const roman = movieTitle.match(/^(.+?)\s+(II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)(?:\s*[:\-–].*)?$/i);
  if (roman) return { base: roman[1].trim(), num: ROMAN_TO_NUM[roman[2].toUpperCase()] };

  return null;
}

function hasWrongSequel(listingTitle: string, movieTitle: string): boolean {
  const parts = getSequelParts(movieTitle);
  
  if (!parts) return false;

  const escaped = escapeRegex(parts.base.toLowerCase());

  const arabicMatch = listingTitle.match(
    new RegExp(`${escaped}\\s*[:\\-–]?\\s*(\\d+)\\b`, "i")
  );
  if (arabicMatch && parseInt(arabicMatch[1]) !== parts.num) return true;

  const romanMatch = listingTitle.match(
    new RegExp(`${escaped}\\s*[:\\-–]?\\s*(II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\\b`, "i")
  );
  if (romanMatch && ROMAN_TO_NUM[romanMatch[1].toUpperCase()] !== parts.num) return true;

  return false;
}
function isRelevantDiscogs(
  item: RawResult,
  movieTitle: string,
  artists: string[]
): boolean {
  const titleLower = item.title.toLowerCase();



  if (isBadDiscogs(item))
   return false;

  if (!titleContainsNumber(movieTitle) && hasSequelSuffix(titleLower, movieTitle))
    return false;

  if (hasWrongSequel(titleLower, movieTitle))
    return false;

  const { phraseMatch, wordRatio, meaningfulWordCount } =
    computeMovieMatch(titleLower, movieTitle);

  const hasSoundtrackSignal =
    titleLower.includes("soundtrack")             ||
    /\bscore\b/.test(titleLower)                  ||
    titleLower.includes("motion picture")         ||
    titleLower.includes("original motion picture");

  const hasArtistMatch = artists.some(a =>
    titleLower.includes(a.toLowerCase())
  );

  const noisePatterns = ["box set", "compilation", "best of", "greatest hits"];
  if (noisePatterns.some(p => titleLower.includes(p)) && !phraseMatch)
    return false;

 if (titleLower.includes("various")) {
  if (!phraseMatch) return false;
  return true;
}

  if (!hasArtistMatch && !phraseMatch && wordRatio < 0.5)
    return false;

  if (hasArtistMatch && !phraseMatch && wordRatio === 0)
   return false;

  if (!hasSoundtrackSignal) {
    if (!hasArtistMatch)
      return false;
    if (!phraseMatch && wordRatio < 0.5)
      return false;
  }

  if (!hasArtistMatch && !phraseMatch) {
    if (meaningfulWordCount < 2 || wordRatio < 0.5)
      return false;
  }
  return true;
}
/* ================= SCORING ================= */

function scoreDiscogs(
  item: RawResult,
  movieYear: number,
  artists: string[]
): number {
  let score = 0;
  const titleLower   = item.title.toLowerCase();
  const formatsLower = (item.format || []).map(f => f.toLowerCase());

  // Artist match is the strongest signal
  for (const artist of artists) {
    if (titleLower.includes(artist.toLowerCase())) score += 10;
  }

  // Various Artists: penalise generic compilations, reward clear OST ones
  if (titleLower.includes("various")) {
    const looksLikeSoundtrack =
      titleLower.includes("soundtrack")           ||
      titleLower.includes("original motion picture") ||
      titleLower.includes("score");
    score += looksLikeSoundtrack ? 2 : -6;
  }

  // Format scoring — vinyl-first
  if (formatsLower.includes("vinyl"))    score += 5;
  if (formatsLower.includes("lp"))       score += 3;
  if (formatsLower.includes("cassette")) score += 2;
  if (formatsLower.includes("cd"))       score -= 1;

  // OST keyword scoring
  if (titleLower.includes("original motion picture")) score += 5;
  if (titleLower.includes("soundtrack"))              score += 4;
  if (titleLower.includes("score"))                   score += 2;

  // Year proximity
  if (item.year !== undefined && item.year !== null) {
    const itemYear = typeof item.year === "number"
      ? item.year
      : parseInt(item.year, 10);
    const diff = Math.abs(itemYear - movieYear);
    if (diff === 0)     score += 4;
    else if (diff <= 2) score += 2;
    else if (diff > 10) score -= 2;
  }

  return score;
}

function isBadDiscogs(item: RawResult): boolean {
  const t = item.title.toLowerCase();
  return t.includes("tribute") || t.includes("cover") || t.includes("remix");
}

function dedupeByTitleYearFormat(results: RawResult[]): RawResult[] {
  const map = new Map<string, RawResult>();
  for (const r of results) {
    const year =
      typeof r.year === "number" ? r.year
      : r.year                  ? parseInt(r.year, 10)
      : "";
    const key = `${r.title.toLowerCase()}|${year}|${(r.format || []).join(",")}`;
    if (!map.has(key)) map.set(key, r);
  }
  return Array.from(map.values());
}

/* ================= CACHE ================= */

async function getCachedVynils(
  title: string,
  year: string
): Promise<ReturnedResult[] | null> {
  const cached = await prisma.discogQuery.findUnique({
    where:   { query: `${title.trim().toLowerCase()}_${year}` },
    include: { items: true },
  });

  if (cached && Date.now() - cached.updatedAt.getTime() < ONE_WEEK_MS) {
    console.log("📦 Using cached Discogs data");
    return cached.items.map(i => ({
      title:  i.title,
      year:   i.year !== null ? Number(i.year) : null,
      format: i.format as string[],
      thumb:  i.thumb ?? undefined,
      uri:    i.uri,
    }));
  }

  return null;
}

/* ================= SAVE TO DB ================= */

async function saveVynilsToDB(
  title: string,
  year: string,
  results: ReturnedResult[]
) {
  const query = `${title.trim().toLowerCase()}_${year}`;
  const rows  = results.map(r => ({
    title:  r.title,
    year:   r.year !== null ? Number(r.year) : null,
    format: r.format,
    thumb:  r.thumb,
    uri:    r.uri,
  }));

  await prisma.discogQuery.upsert({
    where:  { query },
    create: { query, items: { create: rows } },
    update: { updatedAt: new Date(), items: { deleteMany: {}, create: rows } },
  });
}

/* ================= TYPE GUARD ================= */

function isRawResponse(data: unknown): data is RawResponse {
  if (typeof data !== "object" || data === null) return false;
  if (!("results" in data))                      return false;

  const maybe = data as RawResponse;
  if (!Array.isArray(maybe.results))             return false;

  for (const r of maybe.results) {
    if (typeof r !== "object" || r === null)     return false;
    if (typeof r.title !== "string")             return false;
    if (typeof r.uri   !== "string")             return false;
    if ("year" in r && r.year !== undefined &&
        typeof r.year !== "number" &&
        typeof r.year !== "string")              return false;
    if ("format" in r && r.format !== undefined &&
        !Array.isArray(r.format))               return false;
  }

  return true;
}