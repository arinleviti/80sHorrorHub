import * as StreamingAvailability from "streaming-availability";
import { prisma } from "@/app/services/prisma";
const TWO_WEEKS_MS = 1000 * 60 * 60 * 24 * 14;

interface CountryStreamingOption {
  type: string;
  quality?: string | null;
  link?: string | null;
  serviceName?: string | null;
}

interface StreamingAvailabilityResult {
  title: string;
  releaseYear: number;
  streamingOptions: CountryStreamingOption[];
}

export type GetStreamingAvailabilityReturn = StreamingAvailabilityResult | { error: string };

function isCountryStreamingOption(obj: unknown): obj is CountryStreamingOption {
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
  const releaseYear = year ?? 0;

  // Cache check — keyed on the INPUT values, every time
  const cached = await prisma.streamingQuery.findUnique({
    where: {
      title_releaseYear_country: { title, releaseYear, country },
    },
    include: { options: true },
  });

  if (cached && Date.now() - cached.updatedAt.getTime() < TWO_WEEKS_MS) {
    console.log("Using cached streaming data for:", title, year, country);
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

  if (!searchResults || searchResults.length === 0) {
    // FIX: cache the "not streaming anywhere" outcome too, under the
    // same input key — otherwise this exact (title, year, country)
    // re-hits the API on every single page view, forever.
    await prisma.streamingQuery.upsert({
      where: { title_releaseYear_country: { title, releaseYear, country } },
      update: {
        updatedAt: new Date(),
        options: { deleteMany: {} },
      },
      create: {
        title,
        releaseYear,
        country,
        options: { create: [] },
      },
    });
    return { title, releaseYear, streamingOptions: [] };
  }

  // Step 2: Pick the best match (prefer exact year match)
  const firstMatch = year
    ? searchResults.find((s) => s.releaseYear === year) || searchResults[0]
    : searchResults[0];

  // Step 3: Get full show details
  const details = await client.showsApi.getShow({
    id: firstMatch.imdbId || firstMatch.tmdbId!,
    country,
  });

  // Step 4: Map streaming options for the selected country
  const streamingOptions: CountryStreamingOption[] = (details.streamingOptions?.[country] || []).map(
    (opt) => ({
      type: opt.type,
      quality: opt.quality,
      link: opt.link,
      serviceName: opt.service?.name,
    })
  );

  const prismaOptions = streamingOptions.map((opt) => ({
    type: opt.type,
    quality: opt.quality || null,
    link: opt.link || null,
    serviceName: opt.serviceName || null,
  }));

  // FIX: upsert keyed on the INPUT title/year, not details.title/details.releaseYear.
  // This is the change that makes the next read() actually find this row
  // instead of silently re-fetching from the API every time.
  await prisma.streamingQuery.upsert({
    where: {
      title_releaseYear_country: { title, releaseYear, country },
    },
    update: {
      updatedAt: new Date(),
      options: {
        deleteMany: {},
        create: prismaOptions,
      },
    },
    create: {
      title,
      releaseYear,
      country,
      options: { create: prismaOptions },
    },
  });

  console.log(`[DB] Upserted streaming data for "${title}" (${releaseYear}, ${country})`);

  // Step 5: Return result — using `details` for the richer display values
  return {
    title: details.title,
    releaseYear: details.releaseYear || releaseYear,
    streamingOptions,
  };
}