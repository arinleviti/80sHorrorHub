import { prisma } from "@/app/services/prisma";

const ONE_DAY_MS = 1000 * 60 * 60 * 24;
const DISCOGS_KEY = process.env.DISCOGS_KEY;

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

function buildDiscogsQueries(title: string, year: string): string[] {
  const yearNum = Number(year);
  const yearsToTry = [yearNum, yearNum - 1, yearNum + 1]; // handle early/late releases

  const keywords = [
    "original motion picture soundtrack",
    "OST",
    "score",
    "soundtrack",
  ];

  const queries: string[] = [];

  for (const y of yearsToTry) {
    for (const k of keywords) {
      queries.push(`${title} ${y} ${k}`);
    }
  }

  // Also include queries without a year
  for (const k of keywords) {
    queries.push(`${title} ${k}`);
  }

  return queries;
}

/* ================= MAIN FUNCTION ================= */

export async function fetchVynils(title: string, year: string): Promise<ReturnedResult[] | null> {
  const cached = await getCachedVynils(title, year);
  if (cached) {
    console.log(`📦 Discogs cache hit for "${title} (${year})" → using DB`);
    return cached;
  } else {
    console.log(`🔍 Discogs cache miss for "${title} (${year})" → calling API`);
  }

  try {
    const queries = buildDiscogsQueries(title, year);
    const responses = await Promise.all(queries.map(fetchFromDiscogQuery));
    const merged = responses.flatMap(r => r.results);

    const unique = dedupeByTitleYearFormat(merged);

    const scored = unique.map(item => ({
      item,
      score: scoreDiscogs(item, Number(year)),
    }));

    const curated: RawResult[] = [];
    const seenTitles = new Set<string>();

    for (const { item, score } of scored.sort((a, b) => b.score - a.score)) {
      if (!isRelevantDiscogs(item, title)) continue;
      const titleKey = item.title.toLowerCase();
      if (seenTitles.has(titleKey)) continue;
      if (score <= 2) continue;

      curated.push(item);
      seenTitles.add(titleKey);

      if (curated.length >= 15) break;
    }

    if (curated.length === 0) return null;

    const returnedResults: ReturnedResult[] = curated.map(r => ({
      title: r.title,
      year: typeof r.year === "number" ? r.year : r.year ? parseInt(r.year, 10) : null,
      format: Array.isArray(r.format) ? r.format : [],
      thumb: r.thumb,
      uri: r.uri,
    }));

    await saveVynilsToDB(title, year, returnedResults);

    return returnedResults;

  } catch (err) {
    console.error("Discogs pipeline failed:", err);
    return null;
  }
}

/* ================= FETCH SINGLE QUERY ================= */

async function fetchFromDiscogQuery(query: string): Promise<RawResponse> {
  const params = new URLSearchParams({
    q: query,
    format: "vinyl",
    type: "release",
    per_page: "10",
  });

  if (DISCOGS_KEY) params.append("token", DISCOGS_KEY);

  const response = await fetch(`https://api.discogs.com/database/search?${params.toString()}`, {
    headers: { "User-Agent": "VintageHorror/1.0" },
  });

  // Check HTTP status first
  if (!response.ok) {
    const text = await response.text();
    console.error("Discogs request failed:", response.status, response.statusText, text.slice(0, 500));
    throw new Error(`Discogs request failed with status ${response.status}`);
  }

  // Try parsing JSON safely
  let data: unknown;
  try {
    data = await response.json();
  } catch (err) {
    const text = await response.text(); // fallback to see actual content
    console.error("Failed to parse Discogs JSON:", text.slice(0, 500));
    throw new Error("Discogs returned invalid JSON");
  }

  if (!isRawResponse(data)) throw new Error("Invalid Discogs response");

  return data;
}

/* ================= HELPERS ================= */
function isRelevantDiscogs(item: RawResult, movieTitle: string): boolean {
  const title = item.title.toLowerCase();
  const movie = movieTitle.toLowerCase();

  // must contain movie title
  if (!title.includes(movie)) return false;

  // must have one of these keywords
  const keywords = ["soundtrack", "original motion picture soundtrack", "OST", "score"];
  if (!keywords.some(k => title.includes(k.toLowerCase()))) return false;

  // discard known bad
  if (isBadDiscogs(item)) return false;

  return true;
}

function dedupeByTitleYearFormat(results: RawResult[]): RawResult[] {
  const map = new Map<string, RawResult>();
  for (const r of results) {
    const year = typeof r.year === "number" ? r.year : r.year ? parseInt(r.year, 10) : "";
    const key = `${r.title.toLowerCase()}|${year}|${(r.format || []).join(",")}`;
    if (!map.has(key)) map.set(key, r);
  }
  return Array.from(map.values());
}

function scoreDiscogs(item: RawResult, movieYear: number): number {
  let score = 0;
  const title = item.title.toLowerCase();
  /* const formats = item.format || []; */
  const formatsLower = (item.format || []).map(f => f.toLowerCase());
  if (formatsLower.includes("vinyl")) score += 5;
  if (formatsLower.includes("lp")) score += 3;
  if (formatsLower.includes("cassette")) score += 2;
  if (formatsLower.includes("cd")) score -= 1;

  if (title.includes("original")) score += 3;
  if (title.includes("soundtrack")) score += 3;
  if (title.includes("score")) score += 2;

  if (item.year !== undefined && item.year !== null) {
    const itemYear = typeof item.year === "number" ? item.year : parseInt(item.year, 10);
    const diff = Math.abs(itemYear - movieYear);
    if (diff === 0) score += 4;
    else if (diff <= 2) score += 2;
    else if (diff > 10) score -= 2;
  }

  return score;
}

function isBadDiscogs(item: RawResult): boolean {
  const title = item.title.toLowerCase();
  return title.includes("tribute") || title.includes("cover") || title.includes("remix");
}

/* ================= CACHE ================= */

async function getCachedVynils(title: string, year: string): Promise<ReturnedResult[] | null> {
  const cached = await prisma.discogQuery.findUnique({
    where: { query: `${title.trim().toLowerCase()}_${year}` },
    include: { items: true },
  });

  if (cached && Date.now() - cached.updatedAt.getTime() < ONE_DAY_MS) {
    console.log("📦 Using cached Discogs data");
   return cached.items.map(i => ({
  title: i.title,
  year: i.year !== null ? Number(i.year) : null,
  format: i.format as string[],
  thumb: i.thumb ?? undefined,
  uri: i.uri,
}));
  }

  return null;
}

/* ================= SAVE TO DB ================= */

async function saveVynilsToDB(title: string, year: string, results: ReturnedResult[]) {
  await prisma.discogQuery.upsert({
  where: { query: `${title.trim().toLowerCase()}_${year}` },
  create: {
    query: `${title.trim().toLowerCase()}_${year}`,
    items: {
      create: results.map(r => ({
        title: r.title,
        year: r.year !== null ? Number(r.year) : null,
        format: r.format,
        thumb: r.thumb,
        uri: r.uri,
      })),
    },
  },
  update: {
    updatedAt: new Date(),
    items: {
      deleteMany: {},
      create: results.map(r => ({
        title: r.title,
        year: r.year !== null ? Number(r.year) : null,
        format: r.format,
        thumb: r.thumb,
        uri: r.uri,
      })),
    },
  },
});
}

/* ================= TYPE GUARD ================= */

function isRawResponse(data: unknown): data is RawResponse {
  if (typeof data !== "object" || data === null) return false;

  if (!("results" in data)) return false;
  const maybeRawResponse = data as RawResponse;

  if (!Array.isArray(maybeRawResponse.results)) return false;

  for (const r of maybeRawResponse.results) {
    if (typeof r !== "object" || r === null) return false;
    if (typeof r.title !== "string") return false;
    if (typeof r.uri !== "string") return false;
    if ("year" in r && r.year !== undefined && typeof r.year !== "number" && typeof r.year !== "string") return false;
    if ("format" in r && r.format !== undefined && !Array.isArray(r.format)) return false;
  }

  return true;
}