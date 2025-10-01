import * as StreamingAvailability from "streaming-availability";
import { PrismaClient } from '../../generated/prisma/client';

const prisma = new PrismaClient();
const TWO_WEEKS_MS = 1000 * 60 * 60 * 24 * 14;

// Type for the streaming option we return per country
interface CountryStreamingOption {
  type: string;       // subscription, rent, buy
  quality?: string | null;   // HD, SD
  link?: string | null;      // optional URL
  serviceName?: string | null; // e.g., "Prime Video", "Netflix"
}

// Type for the function return if successful
interface StreamingAvailabilityResult {
  title: string;
  releaseYear: number;
  streamingOptions: CountryStreamingOption[];
}

// Type for the function return if there’s an error
export type GetStreamingAvailabilityReturn = StreamingAvailabilityResult | { error: string };
function isCountryStreamingOption(obj:unknown): obj is CountryStreamingOption {
   if (typeof obj !== "object" || obj === null) return false;
   const o = obj as Record<string, unknown>;
  return (
    typeof o.type === "string" &&
    (typeof o.quality === "string" || o.quality === undefined || o.quality === null) &&
    (typeof o.link === "string" || o.link === undefined || o.link === null) &&
    (typeof o.serviceName === "string" || o.serviceName === undefined || o.serviceName === null)
  );
}

export async function getStreamingAvailability(
  title: string,
  country: string,
  year?: number
): Promise<GetStreamingAvailabilityReturn> {

  const cached = await prisma.streamingQuery.findUnique({
    where:  {
    title_releaseYear_country: {
      title,
      releaseYear: year ?? 0, // must provide releaseYear
      country,
    },
  },
  include: { options: true },
});
 if (cached && Date.now() - cached.updatedAt.getTime() < TWO_WEEKS_MS) {
    // return cached data
    console.log("Using cached streaming data for:", title, year, country);
    // Validate cached options
    const validOptions = cached.options.filter(isCountryStreamingOption);
    if (validOptions.length !== cached.options.length) {
      console.warn("Some cached streaming options were invalid and have been filtered out.");
    }
    return {
      title: cached.title,
      releaseYear: cached.releaseYear,
      streamingOptions: validOptions,
    };
  }
  const RAPID_API_KEY = process.env.STREAMING_AVAILABILITY;
  const client = new StreamingAvailability.Client(
    new StreamingAvailability.Configuration({ apiKey: RAPID_API_KEY })
  );

  // Step 1: Search shows by title
  const searchResults = await client.showsApi.searchShowsByTitle({ title, country });
  if (!searchResults || searchResults.length === 0) return { error: "No results found" };

  // Step 2: Pick the first match (or filter by year)
  const firstMatch = year
    ? searchResults.find((s) => s.releaseYear === year) || searchResults[0]
    : searchResults[0];

  // Step 3: Get full show details
  const details = await client.showsApi.getShow({
    id: firstMatch.imdbId || firstMatch.tmdbId!,
    country
  });

  // Step 4: Map streaming options for the selected country
  const streamingOptions: CountryStreamingOption[] = (details.streamingOptions?.[country] || []).map(opt => ({
    type: opt.type,
    quality: opt.quality,
    link: opt.link,
    serviceName: opt.service?.name
  }));
  const prismaOptions = streamingOptions.map(opt => ({
    type: opt.type,
    quality: opt.quality || null,
    link: opt.link || null,
    serviceName: opt.serviceName || null
  }));
/* console.log('Streaming options:', streamingOptions); */
await prisma.streamingQuery.upsert({
  where: {
    title_releaseYear_country: {
      title: details.title,
      releaseYear: details.releaseYear || 0,
      country,
    },
  },
  update: {
    updatedAt: new Date(), // ✅ force bump the timestamp
    options: {
      deleteMany: {},
      create: prismaOptions.map(opt => ({
        type: opt.type,
        quality: opt.quality ?? null,
        link: opt.link ?? null,
        serviceName: opt.serviceName ?? null,
      })),
    },
  },
  create: {
    title: details.title,
    releaseYear: details.releaseYear || 0,
    country,
    options: {
      create: prismaOptions.map(opt => ({
        type: opt.type,
        quality: opt.quality ?? null,
        link: opt.link ?? null,
        serviceName: opt.serviceName ?? null,
      })),
    },
  },
});
 console.log(`[DB] Upserted streaming data for "${details.title}"`);
  // Step 5: Return result
  return {
    title: details.title,
    releaseYear: details.releaseYear || 0,
    streamingOptions
  };
  
}




