import * as StreamingAvailability from "streaming-availability";

// Type for the streaming option we return per country
interface CountryStreamingOption {
  type: string;       // subscription, rent, buy
  quality?: string;   // HD, SD
  link?: string;      // optional URL
  serviceName?: string; // e.g., "Prime Video", "Netflix"
}

// Type for the function return if successful
interface StreamingAvailabilityResult {
  title: string;
  releaseYear: number;
  streamingOptions: CountryStreamingOption[];
}

// Type for the function return if there’s an error
export type GetStreamingAvailabilityReturn = StreamingAvailabilityResult | { error: string };

export async function getStreamingAvailability(
  title: string,
  country: string,
  year?: number
): Promise<GetStreamingAvailabilityReturn> {

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
/* console.log('Streaming options:', streamingOptions); */

  // Step 5: Return result
  return {
    title: details.title,
    releaseYear: details.releaseYear || 0,
    streamingOptions
  };
  
}




