import { searchSpotify } from "@/app/services/spotify";
import { SpotifyEmbed } from "./spotify-playlist";
import { CrewMemberInfo, Movie } from "@/app/services/tmdb";

interface SpotifySectionProps {
  movie: Movie;
  credits: {
    crew: CrewMemberInfo[];
  };
}

export default async function SpotifySection({ movie, credits }: SpotifySectionProps) {
  const playlist = await searchSpotify(
    movie.title,
    Number(movie.release_date?.slice(0, 4)),
    credits.crew
  );

  if (!playlist) return null;

  return (
    <div className="spotify-wrapper">
      <SpotifyEmbed playlist={playlist} />
    </div>
  );
}