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

  // Build absolute Discogs URLs here on the server. DiscogsList is a client component, so its props
  // are embedded in the page; a bare "/release/…" path there gets crawled by Google as a page on our domain.
  const items = results?.map(({ uri, ...rest }) => ({ ...rest, url: `https://www.discogs.com${uri}` })) ?? null;

  return <DiscogsList results={items} />;
}