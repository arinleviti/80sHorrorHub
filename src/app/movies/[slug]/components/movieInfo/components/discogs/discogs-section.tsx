import { fetchVynils } from "@/app/services/discogs";
import { DiscogsList } from "./discogs-list";
import { Movie } from "@/app/services/tmdb";

interface DiscogsSectionProps {
  movie: Movie;
   musicPeople: string[];
}

export default async function DiscogsSection({ movie, musicPeople }: DiscogsSectionProps) {
  const results = await fetchVynils(
    movie.title,
    movie.release_date?.slice(0, 4) || "",
    musicPeople
  );

  return <DiscogsList results={results} />;
}