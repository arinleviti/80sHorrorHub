import { getStreamingAvailability } from "@/app/services/streamingAvail";
import { Movie } from "@/app/services/tmdb";
import StreamingAvail from "./streaming-avail";

interface StreamingSectionProps {
  movie: Movie;
}

export default async function StreamingSection({ movie }: StreamingSectionProps) {
  const streamingAvailability = await getStreamingAvailability(
    movie.title,
    "us",
    movie.release_date
      ? Number(movie.release_date.slice(0, 4))
      : undefined
  );

  return (
    <StreamingAvail
      streamingAvailability={streamingAvailability}
    />
  );
}