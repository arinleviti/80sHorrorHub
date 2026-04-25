import { fetchVynils } from "@/app/services/discogs";
import { DiscogsList } from "./discogs-list";
import { Movie } from "@/app/services/tmdb";

interface DiscogsSectionProps {
  movie: Movie;
}

export default async function DiscogsSection({ movie }: DiscogsSectionProps) {
  const results = await fetchVynils(
    movie.title,
    movie.release_date?.slice(0, 4) || ""
  );

  return <DiscogsList results={results} />;
}