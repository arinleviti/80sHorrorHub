import Image from "next/image";
import { Container, Row, Col } from "react-bootstrap";
import styles from "./movie-info.module.css";
import { getYouTubeVideos, YouTubeVideo } from "@/app/services/youtube";
import VideoList from "../videoList/video-list";
import { Movie, TMDBImageConfig, CastMemberInfo, CrewMemberInfo } from "@/app/services/tmdb";
import { getCuratedEbayItems } from "@/app/services/ebay/getCuratedEbayItems";
import { EbayItemSummary } from "@/app/services/ebay/getEbayItems";
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
import { RedditFeed } from "./components/RedditFeed/redditFeed";

interface MovieInfoProps {
  movie: Movie;
  config: TMDBImageConfig;
  credits: {
    cast: CastMemberInfo[];
    crew: CrewMemberInfo[];
  };
}

export default async function MovieInfo({ movie, config, credits }: MovieInfoProps) {
  const posterUrl = movie.poster_path
    ? `${config.secure_base_url}w500${movie.poster_path}`
    : "/placeholder-poster.png"; // fallback if poster missing
const topActorNames = credits.cast.slice(0, 5).map(actor => actor.actorName);
  const [youTubeVideos, curatedEbayItems, streamingAvailability, hfSuggestions, discogsList, spotifyPlaylist, aiDescription]: [
    YouTubeVideo[],
    EbayItemSummary[],
    GetStreamingAvailabilityReturn,
    HFSuggestionItem[] | null,
    ReturnedResult[] | null,
    SpotifyPlaylistEmbed | null,
    AiDescription | null
  ] = await Promise.all([
    getYouTubeVideos(movie.title, movie.release_date?.slice(0, 4) || '', topActorNames),
    getCuratedEbayItems(movie.id, movie.title, movie.release_date?.slice(0, 4) || ''),
    /* getEbayItems(`${movie.title} ${movie.release_date?.slice(0, 4) || ''} memorabilia collectible`), */
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

  const director = credits.crew.find((member) => member.job === "Director");

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
  {/* Title - Large and bold */}
  <h1 className="movie-title mb-1">
    {movie.title}
  </h1>

  {/* Director - Smaller, styled with your custom class */}
  {director && (
    <h4 className={`${styles.director} mb-1`}>
      {director.name}
    </h4>
  )}

  {/* Year - Muted and distinct */}
  {movie.release_date && (
    <p className={`${styles.year} mb-3 text-muted`}>
      ({movie.release_date.slice(0, 4)})
    </p>
  )}

  {/* Overview */}
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
          <VideoList videos={youTubeVideos} title="YouTube Curated Selection" />
        </Col>
       
      </Row>

     {/* 💿 Merchandise & Streaming + Reddit */}
<Row className="mb-5">
  {/* LEFT COLUMN: Discogs + eBay */}
  <Col md={6}>
    
    <Row>
      <Col>
        <EbayItemsList ebayItems={curatedEbayItems} />
      </Col>
    </Row>
  </Col>

  {/* RIGHT COLUMN: Streaming Availability + Reddit */}
  <Col md={6}>
  <Row className="mb-3">
      <Col>
        <DiscogsList results={discogsList} />
      </Col>
    </Row>
    <Row className="mb-3">
      <Col>
        <StreamingAvailabilityList streamingAvailability={streamingAvailability} />
      </Col>
    </Row>
    <Row>
      <Col>
        <RedditFeed movie={movie} limit={5} />
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
  </Col>
</Row>
     
    </Container>
  );
}
