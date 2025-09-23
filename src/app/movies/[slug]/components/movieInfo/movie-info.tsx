import Image from "next/image";
import { getYouTubeVideos, YouTubeVideo } from "@/app/services/youtube";
import VideoList from "../videoList/video-list";
import { Movie, TMDBImageConfig, MovieCredits } from "@/app/services/tmdb";
import { getEbayItems, EbaySearchResponse } from "@/app/services/ebay";
import {fetchVynils} from "@/app/services/discogs";
import { getStreamingAvailability, GetStreamingAvailabilityReturn } from "@/app/services/streamingAvail";
import { getHFSuggestions, HFSuggestionItem } from "@/app/services/huggingFaceAI";
import CastList from "./components/castList/cast-list";
import CrewList from "./components/crewList/crew-list";
import HFSuggestionsList from "./components/HFSuggestionList/hf-suggestion-list";
import EbayItemsList from "./components/ebaySearchResponse/ebay-response";
import StreamingAvailabilityList from "./components/streaming-avail/streaming-avail";
import { DiscogsList, ReturnedResult } from "./components/discogs/discogs-list";
import { SpotifyEmbed } from "./components/spotifyPlaylist/spotify-playlist";
import { SearchSpotifyPlaylist,  SpotifyPlaylistEmbed } from "@/app/services/spotify";

interface MovieInfoProps {
  movie: Movie;
  config: TMDBImageConfig;
  credits: MovieCredits;
}


export default async function MovieInfo({ movie, config, credits }: MovieInfoProps) {
  const posterUrl = movie.poster_path
    ? `${config.secure_base_url}w500${movie.poster_path}`
    : "/placeholder-poster.png"; // fallback if poster missing
  const [trailers, behindTheScenes, topMoments, ebayItems, streamingAvailability, /* hfSuggestions, */ discogsList, spotifyPlaylist]: [
    YouTubeVideo[],
    YouTubeVideo[],
    YouTubeVideo[],
    EbaySearchResponse,
    GetStreamingAvailabilityReturn,
    /* HFSuggestionItem[] | null, */
    ReturnedResult[] | null,
    SpotifyPlaylistEmbed | null
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
    /* getHFSuggestions(movie.id.toString(),movie.title, movie.release_date ? movie.release_date.slice(0, 4) : ''), */
    fetchVynils(movie.title, movie.release_date ? movie.release_date.slice(0, 4) : ''),
    SearchSpotifyPlaylist(`${movie.title}`, 5) // return null if no playlist found
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

      <CastList cast={credits.cast} config={config} />
      <CrewList crew={credits.crew} />
      {/*Uncomment when the movie list is full */}
      {/* <HFSuggestionsList suggestions={hfSuggestions || []} /> */}
      {spotifyPlaylist ? (
  <SpotifyEmbed playlist={spotifyPlaylist} />
) : (
  <p>No Spotify soundtrack available</p>
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
      <DiscogsList results={discogsList} />
      <EbayItemsList ebayItems={ebayItems} />
      <StreamingAvailabilityList streamingAvailability={streamingAvailability} />

    </div>
  );
}
