import { PrismaClient } from '../../generated/prisma/client';
const prisma = new PrismaClient();
const ONE_DAY_MS = 1000 * 60 * 60 * 24;
const ONE_MINUTE_MS = 1000 * 60; // 1 minute
const DISCOGS_KEY = process.env.DISCOGS_KEY;
export interface Query {
  q: string,
  type: string,
  format: string,
  token: string,
}
export interface RawResult {
  id?: number;        // Discogs internal ID (optional)
  title: string;      // e.g., "The Thing (Original Soundtrack)"
  year?: number;      // release year (optional)
  format?: string[];  // e.g., ["Vinyl", "LP"]
  thumb?: string;     // thumbnail image URL (optional)
  uri: string;        // Discogs URL path to the release
  country?: string;   // e.g., "US" (optional)
  type?: string;      // usually "release"
}
export interface Pagination {
  page: number,
  pages: number,
  per_page: number,
  items: number,
  urls: Record<string, string>
}
export interface RawResponse {
  pagination: Pagination,
  results: RawResult[]
}
export interface ReturnedResult {
  title: string;      // e.g., "The Thing (Original Soundtrack)"
  year: number | null;      // release year (optional)
  format: string[];  // e.g., ["Vinyl", "LP"]
  thumb?: string;     // thumbnail image URL (optional)
  uri: string;        // Discogs URL path to the release
}

export async function fetchVynils(title: string, year: string): Promise<ReturnedResult[] | null> {

  // 1️⃣ Try to get cached results first
  const cached = await getCachedVynils(title, year);
  if (cached) return cached;

  // 2️⃣ Fetch from Discogs API
  let apiResponse: RawResponse;
  try {
    apiResponse = await fetchFromDiscog(title, year);
    console.log("🤖 Discog API response:", JSON.stringify(apiResponse, null, 2));
  } catch (err) {
    console.error("Failed to fetch Hugging Face API response:", err);
    return null;
  }

  // 3️⃣ Map raw results to ReturnedResult[]
  const returnedResults: ReturnedResult[] = apiResponse.results.map(r => ({
    title: r.title,
    year: r.year ? Number(r.year) : null,
    format: Array.isArray(r.format) ? r.format : [],
    thumb: r.thumb ?? undefined,
    uri: r.uri,
  }));

  if (returnedResults.length === 0) return null;

  // 4️⃣ Save/update results in DB
  await saveVynilsToDB(title, year, returnedResults);

  return returnedResults;
}

async function getCachedVynils(title: string, year: string): Promise<ReturnedResult[] | null> {
  const cached = await prisma.discogQuery.findUnique({
    where: { query: `${title}${year}` },
    include: { items: true }
  })

  if (cached && Date.now() - cached.updatedAt.getTime() < ONE_DAY_MS) {
    //return cached data
    console.log("Using cached Discog data for movie:", title);
    const mappedData: ReturnedResult[] = cached.items.map(i => ({
      title: i.title,
      year: i.year,
      format: Array.isArray(i.format) ? i.format.filter(f => typeof f === "string") as string[] : [],
      thumb: i.thumb ?? undefined,
      uri: i.uri,
    }))
    return mappedData;
  }
  return null
}

async function saveVynilsToDB(title: string, year: string, results: ReturnedResult[]): Promise<void> {
  if (results.length === 0) return;
  try {
    await prisma.discogQuery.upsert({
      where: { query: `${title}${year}` },
      create: {
        query: `${title}${year}`,
        items: {
          create: results.map(i => ({
            title: i.title,
            year: i.year,
            format: i.format,
            thumb: i.thumb,
            uri: i.uri,
          }))
        },
      },

      update: {
        items: {
          deleteMany: {},
          create: results.map(i => ({
            title: i.title,
            year: i.year,
            format: i.format,
            thumb: i.thumb,
            uri: i.uri,
          }))
        },
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("Failed to upsert Discog data:", err);
  }

}



function isRawResponse(data: unknown): data is RawResponse {
  if (typeof data !== 'object' || data === null) return false;

  const pagination = (data as { pagination?: unknown }).pagination;
  if (typeof pagination !== 'object' || pagination === null) return false;

  const results = (data as { results?: unknown }).results;
  if (!Array.isArray(results)) return false;

  for (const r of results) {
    if (typeof r !== 'object' || r === null) return false;
    if (typeof (r as { title?: unknown }).title !== 'string') return false;
    if (typeof (r as { uri?: unknown }).uri !== 'string') return false;

    // relaxed checks:
    const year = (r as { year?: unknown }).year;
    if (year !== undefined && typeof year !== 'string' && typeof year !== 'number') return false;

    const format = (r as { format?: unknown }).format;
    if (format !== undefined && !Array.isArray(format)) return false;
  }

  return true;
}

async function fetchFromDiscog(title: string, year: string): Promise<RawResponse> {
  const queryKey = `${title} ${year} soundtrack`;
  const params = new URLSearchParams({
    q: queryKey,
    format: "vinyl",
    type: "release",
    per_page: "5"
  })
params.append("token", DISCOGS_KEY ?? "");
  const response = await fetch(`https://api.discogs.com/database/search?${params.toString()}`, {
    headers: {
      'User-Agent': 'YourAppName/1.0',
    },
  });
  const data = await response.json();
console.log("Discogs raw response:", data);
  if (!isRawResponse(data)) {
    throw new Error("Discogs API returned unexpected data");
  }
  return data;
}
