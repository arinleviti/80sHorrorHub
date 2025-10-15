import Image from "next/image";
import { Container, Row, Col } from "react-bootstrap";
import styles from "./movie-info.module.css";
import { getYouTubeVideos, YouTubeVideo } from "@/app/services/youtube";
import VideoList from "../videoList/video-list";
import { Movie, TMDBImageConfig, MovieCredits } from "@/app/services/tmdb";
import { getEbayItems, EbaySearchResponse } from "@/app/services/ebay";
import {fetchVynils} from "@/app/services/discogs";
import { getStreamingAvailability, GetStreamingAvailabilityReturn } from "@/app/services/streamingAvail";
import CastList from "./components/castList/cast-list";
import CrewList from "./components/crewList/crew-list";
import EbayItemsList from "./components/ebaySearchResponse/ebay-response";
import StreamingAvailabilityList from "./components/streaming-avail/streaming-avail";
import { DiscogsList, ReturnedResult } from "./components/discogs/discogs-list";
import { SpotifyEmbed } from "./components/spotifyPlaylist/spotify-playlist";
import { SearchSpotifyPlaylist,  SpotifyPlaylistEmbed } from "@/app/services/spotify";
import {fetchAIDescription, AiDescription} from "@/app/services/AiGeneratedMainContent";
import AiContent from "./components/AIContent/ai-content";

interface MovieInfoProps {
  movie: Movie;
  config: TMDBImageConfig;
  credits: MovieCredits;
}


export default async function MovieInfo({ movie, config, credits }: MovieInfoProps) {
  const posterUrl = movie.poster_path
    ? `${config.secure_base_url}w500${movie.poster_path}`
    : "/placeholder-poster.png"; // fallback if poster missing
  const [trailers, behindTheScenes, topMoments, ebayItems, streamingAvailability, /* hfSuggestions, */ discogsList, spotifyPlaylist, aiDescription]: [
    YouTubeVideo[],
    YouTubeVideo[],
    YouTubeVideo[],
    EbaySearchResponse,
    GetStreamingAvailabilityReturn,
    /* HFSuggestionItem[] | null, */
    ReturnedResult[] | null,
    SpotifyPlaylistEmbed | null,
    AiDescription | null
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
    SearchSpotifyPlaylist(`${movie.title}`, 5), // return null if no playlist found
    fetchAIDescription(movie.id),
  ]);
  return (
     <Container className={`${styles.moviePage} my-5`}>
      {/* 🎬 HEADER */}
      <Row className="align-items-start mb-5">
        {/* LEFT: Poster */}
        <Col md={5} className="text-center mb-4 mb-md-0">
          <Image
            src={posterUrl}
            alt={movie.title}
            width={400}
            height={600}
            className="img-fluid rounded shadow"
          />
        </Col>

        {/* RIGHT: Title, Spotify, Overview */}
        <Col md={7}>
          <div className="d-flex justify-content-between align-items-start flex-wrap">
            <h1 className="mb-3 me-3">
              {movie.title}{" "}
              {movie.release_date ? `(${movie.release_date.slice(0, 4)})` : ""}
            </h1>

            {/* 🎧 Spotify on top-right */}
            {spotifyPlaylist && (
              <div className="ms-auto mb-3" style={{ maxWidth: "300px" }}>
                <SpotifyEmbed playlist={spotifyPlaylist} />
              </div>
            )}
          </div>

          {/* Overview just below title + Spotify */}
          <p className={styles.overview}>{movie.overview}</p>
          <p className={styles.popularity}>Popularity: {movie.popularity}</p>
        </Col>
      </Row>

      {/* 👥 Cast & Crew */}
      <Row className="mb-5">
        <Col>
          <CastList cast={credits.cast} config={config} />
        </Col>
        <Col>
          <CrewList crew={credits.crew} />
        </Col>
      </Row>

      {/* 🤖 AI Content */}
      <Row className="mb-5">
        <Col>
          <AiContent content={aiDescription} />
        </Col>
      </Row>

      {/* 🎥 Videos */}
      <Row className="mb-5">
        <Col>
          <VideoList videos={trailers} title="Trailers" />
        </Col>
        <Col>
          <VideoList videos={behindTheScenes} title="Behind the Scenes" />
        </Col>
        <Col>
          <VideoList videos={topMoments} title="Top Moments" />
        </Col>
      </Row>

      {/* 💿 Merchandise & Streaming */}
      <Row className="mb-5">
        <Col>
          <DiscogsList results={discogsList} />
        </Col>
        <Col>
          <EbayItemsList ebayItems={ebayItems} />
        </Col>
        <Col>
          <StreamingAvailabilityList
            streamingAvailability={streamingAvailability}
          />
        </Col>
      </Row>
    </Container>
  );
}
