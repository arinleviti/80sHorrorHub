import VideoList from "./video-list";
import { getYouTubeVideos } from "@/app/services/youtube";
import { Movie, CastMemberInfo, CrewMemberInfo } from "@/app/services/tmdb";

interface YouTubeSectionProps {
  movie: Movie;
  credits: {
    cast: CastMemberInfo[];
    crew: CrewMemberInfo[];
  };
}
export default async function YouTubeSection({ movie, credits }: YouTubeSectionProps) {
  const topActors = credits.cast.slice(0, 5).map(a => a.actorName);

  const videos = await getYouTubeVideos(
    movie.title,
    movie.release_date?.slice(0, 4) || "",
    topActors
  );

  return (
    <VideoList
      videos={videos}
      title="YouTube Curated Selection"
    />
  );
}