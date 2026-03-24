import Image from "next/image";
import { Container, Row, Col } from "react-bootstrap";
import styles from "./movie-info.module.css";
import { getYouTubeVideos, YouTubeVideo } from "@/app/services/youtube";
import VideoList from "../videoList/video-list";
import { Movie, TMDBImageConfig, MovieCredits } from "@/app/services/tmdb";
import { getEbayItems, EbaySearchResponse } from "@/app/services/ebay";
import { fetchVynils } from "@/app/services/discogs";
import { getStreamingAvailability, GetStreamingAvailabilityReturn } from "@/app/services/streamingAvail";
import CastList from "./components/castList/cast-list";
import CrewList from "./components/crewList/crew-list";
import EbayItemsList from "./components/ebaySearchResponse/ebay-response";
import StreamingAvailabilityList from "./components/streaming-avail/streaming-avail";
import { DiscogsList, ReturnedResult } from "./components/discogs/discogs-list";
import { SpotifyEmbed } from "./components/spotifyPlaylist/spotify-playlist";
import { SearchSpotifyPlaylist, SpotifyPlaylistEmbed } from "@/app/services/spotify";
import { fetchAIDescription, AiDescription } from "@/app/services/AiGeneratedMainContent";
import AiContent from "./components/AIContent/ai-content";
import { getHFSuggestions, HFSuggestionItem } from "@/app/services/huggingFaceAI";
import HFSuggestionsList from "./components/HFSuggestionList/hf-suggestion-list";
import ContributionForm from "./components/contribution/contributionForm";
import { getMovieContributions } from "@/app/services/contributions";
import { Contribution, ContributionSection } from "@prisma/client";
import ContributionList from "./components/contributions/contribution-list";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface MovieInfoProps {
  movie: Movie;
  config: TMDBImageConfig;
  credits: MovieCredits;
}

export default async function MovieInfo({ movie, config, credits }: MovieInfoProps) {
  const posterUrl = movie.poster_path
    ? `${config.secure_base_url}w500${movie.poster_path}`
    : "/placeholder-poster.png"; // fallback if poster missing

  const [trailers, behindTheScenes, topMoments, ebayItems, streamingAvailability, hfSuggestions, discogsList, spotifyPlaylist, aiDescription]: [
    YouTubeVideo[],
    YouTubeVideo[],
    YouTubeVideo[],
    EbaySearchResponse,
    GetStreamingAvailabilityReturn,
    HFSuggestionItem[] | null,
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
    getHFSuggestions(movie.id.toString(), movie.title, movie.release_date ? movie.release_date.slice(0, 4) : ''),
    fetchVynils(movie.title, movie.release_date ? movie.release_date.slice(0, 4) : ''),
    SearchSpotifyPlaylist(`${movie.title}`, 5), // return null if no playlist found
    fetchAIDescription(movie.id),
  ]);
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const contributions = await getMovieContributions(
    movie.id.toString(),
    userId
  );

  const grouped: Record<ContributionSection, Contribution[]> = {
    SYNOPSIS: [],
    FUN_FACTS: [],
    PRODUCTION_CONTEXT: [],
    RECEPTION: [],
    OTHER: [],
  };

  contributions.forEach((c: Contribution) => {
    grouped[c.section].push(c);
  });


  return (

    <Container className={`${styles.moviePage} my-5`}>
      {/* 🎬 HERO */}
      <section className="movie-hero mb-5">
        <Container>
          <Row className="align-items-start">

            {/* POSTER */}
            <Col xs={12} md={5} lg={4} className="text-center mb-4 mb-md-0">
              <Image
                src={posterUrl}
                alt={movie.title}
                width={600}
                height={900}
                className="img-fluid rounded shadow"
              />
            </Col>

            {/* LEFT CONTENT (TITLE + OVERVIEW) */}
            <Col xs={12} md={4} lg={5}>

              <h1 className="movie-title">
                {movie.title}
                {movie.release_date && (
                  <span className={styles.year}>
                    {" "}({movie.release_date.slice(0, 4)})
                  </span>
                )}
              </h1>

              <p className={styles.textContent}>
                {movie.overview}
              </p>

            </Col>

            {/* RIGHT CONTENT (SPOTIFY) */}
            <Col xs={12} md={3} lg={3}>
              {spotifyPlaylist && (
                <div className="spotify-wrapper">
                  <SpotifyEmbed playlist={spotifyPlaylist} />
                </div>
              )}
            </Col>

          </Row>
        </Container>
      </section>

      {/* 👥 Cast & Crew */}
      <Row className="mb-5">
        <Col>
          <CastList cast={credits.cast} config={config} />
        </Col>
        <Col>
          <CrewList crew={credits.crew} />
        </Col>
      </Row>

      {/* AI Content, form, contributions */}
      <Row className="mb-5">
        <Col md={6}>
          <AiContent content={aiDescription} />
        </Col>

        <Col md={6}>
          <ContributionForm movieId={movie.id} />
        </Col>
      </Row>

      <Row className="mb-5">
        <Col>
          <ContributionList grouped={grouped} />
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

      {/* 🤖 AI Suggestions */}
      {hfSuggestions && hfSuggestions.length > 0 && (
        <Row className="mb-5">
          <Col>
            <HFSuggestionsList suggestions={hfSuggestions} />
          </Col>
        </Row>
      )}
    </Container>
  );
}
