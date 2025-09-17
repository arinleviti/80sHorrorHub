import Image from "next/image";
import { getYouTubeVideos, YouTubeVideo } from "@/app/services/youtube";
import VideoList from "../videoList/video-list";
import { Movie, TMDBImageConfig, MovieCredits } from "@/app/services/tmdb";
import { getEbayItems, EbaySearchResponse } from "@/app/services/ebay";
import { getStreamingAvailability, GetStreamingAvailabilityReturn } from "@/app/services/streamingAvail";
import { getHFSuggestions, HFSuggestionItem } from "@/app/services/huggingFaceAI";

interface MovieInfoProps {
  movie: Movie;
  config: TMDBImageConfig;
  credits: MovieCredits;
}


export default async function MovieInfo({ movie, config, credits }: MovieInfoProps) {
  const posterUrl = movie.poster_path
    ? `${config.secure_base_url}w500${movie.poster_path}`
    : "/placeholder-poster.png"; // fallback if poster missing
  const [trailers, behindTheScenes, topMoments, ebayItems, streamingAvailability, hfSuggestions]: [
    YouTubeVideo[],
    YouTubeVideo[],
    YouTubeVideo[],
    EbaySearchResponse,
    GetStreamingAvailabilityReturn,
    HFSuggestionItem[] | null
  ] = await Promise.all([
    getYouTubeVideos(`${movie.title} ${movie.release_date?.slice(0, 4) || ''} trailer`),
    getYouTubeVideos(`${movie.title} ${movie.release_date?.slice(0, 4) || ''} behind the scenes interview`),
    getYouTubeVideos(`${movie.title} ${movie.release_date?.slice(0, 4) || ''} top moments`),
    getEbayItems(`${movie.title} ${movie.release_date?.slice(0, 4) || ''} memorabilia collectible`),
    getStreamingAvailability(
      movie.title,
      "us",
      movie.release_date ? Number(movie.release_date.slice(0, 4)) : undefined
    ),
    getHFSuggestions(movie.id.toString(), movie.release_date ? movie.release_date.slice(0, 4) : '')
  ]);
  return (
    <div>
      <h1>
        {movie.title}{" "}
        {movie.release_date ? `(${movie.release_date.slice(0, 4)})` : ""}
      </h1>

      <Image
        src={posterUrl}
        alt={movie.title}
        width={500}
        height={750}
        priority
      />
      <p>{movie.overview}</p>
      <p>Popularity: {movie.popularity}</p>
      <h2>Cast</h2>
      {credits.cast.length > 0 ? (
        <ul>
          {credits.cast.map((member, index) => (
            <li key={`${member.actorName}-${index}`}>
              {member.character}: {member.actorName}
              {member.profile_path && (
                <Image
                  src={`${config.secure_base_url}w185${member.profile_path}`}
                  alt={member.actorName}
                  width={50}
                  height={70}
                />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No cast information available</p>
      )}


      {credits.crew.length > 0 && (
        <div>
          <h2>Crew</h2>
          <ul>
            {credits.crew.map((member, index) => (
              <li key={index}> {member.job}: {member.name}</li>
            ))}
          </ul>
        </div>
      )}
{hfSuggestions && hfSuggestions.length > 0 && (
  <div>
    <h2>AI Suggested Movies</h2>
    <ul>
      {hfSuggestions.map(s => (
        <li key={s.title}>
          {s.title} ({s.year})
        </li>
      ))}
    </ul>
  </div>
)}

      {trailers.length > 0 ? (
        <VideoList videos={trailers} title="Trailers" />
      ) : (
        <p>No trailers available</p>
      )}
      {behindTheScenes.length > 0 ? (
        <VideoList videos={behindTheScenes} title="Behind the Scenes & Interviews" />
      ) : (
        <p>No behind the scenes videos available</p>
      )}
      {topMoments.length > 0 ? (
        <VideoList videos={topMoments} title="Top Moments" />
      ) : (
        <p>No top moments videos available</p>
      )}
      {ebayItems.itemSummaries.length > 0 ? (
        <div>
          <h2>eBay Items</h2>
          <ul>
            {ebayItems.itemSummaries.map((item) => (
              <li key={item.itemAffiliateWebUrl}>
                <a href={item.itemAffiliateWebUrl} target="_blank" rel="noopener noreferrer">
                  {item.title} - {item.price.value} {item.price.currency}
                </a>
                <Image
                  src={item.image.imageUrl}
                  alt={item.title}
                  width={80}
                  height={100}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>No eBay items available</p>
      )}
      {streamingAvailability && !('error' in streamingAvailability) ? (
        <div>
          <h2>Streaming Availability in the US</h2>
          <ul>
            {streamingAvailability.streamingOptions.map((option, i) => (
              <li key={`${option.serviceName}-${option.type}-${option.quality || "NA"}-${i}`}>
                {option.serviceName}: {option.type} ({option.quality})
                {option.link && (
                  <a href={option.link} target="_blank" rel="noopener noreferrer">
                    Watch
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>No streaming availability information available</p>
      )}
    </div>
  );
}
