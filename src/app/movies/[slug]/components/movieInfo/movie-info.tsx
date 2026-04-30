import Image from "next/image";
import { Container, Row, Col } from "react-bootstrap";
import styles from "./movie-info.module.css";
import { Movie, TMDBImageConfig, CastMemberInfo, CrewMemberInfo } from "@/app/services/tmdb";
import CastList from "./components/castList/cast-list";
import CrewList from "./components/crewList/crew-list";
import { fetchAIDescription } from "@/app/services/AiGeneratedMainContent";
import AiContent from "./components/AIContent/ai-content";
import ContributionForm from "./components/contribution/contributionForm";
import { getMovieContributions } from "@/app/services/contributions";
import { ContributionSection } from "@prisma/client";
import ContributionList from "./components/contributions/contribution-list";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import RedditSection from "./components/RedditFeed/reddit-section";
import { Prisma } from "@prisma/client";
import ShareButtons from "./shareButtons/share-buttons";
import BackToTop from "./components/BackToTop/back-to-top";
import { Suspense } from "react";
import YouTubeSection from "../videoList/youtube-section";
import EbaySection from "./components/ebaySearchResponse/ebay-section";
import SpotifySection from "./components/spotifyPlaylist/spotify-section";
import DiscogsSection from "./components/discogs/discogs-section";
import HFSection from "./components/HFSuggestionList/hf-section";
import StreamingSection from "./components/streaming-avail/streaming-section";
import LoadingBlock from "../../../../LoadingBlock/loading-block";
import { extractMusicPeople } from "@/utils/extractMusicPpl";

interface MovieInfoProps {
  movie: Movie;
  config: TMDBImageConfig;
  credits: {
    cast: CastMemberInfo[];
    crew: CrewMemberInfo[];
  };
}

type ContributionWithUser = Prisma.ContributionGetPayload<{
  include: { user: true; votes: true };
}>;

export default async function MovieInfo({ movie, config, credits }: MovieInfoProps) {
  const posterUrl = movie.imagekitPosterPath
    ? movie.imagekitPosterPath
    : movie.poster_path
      ? `${config.secure_base_url}w500${movie.poster_path}`
      : "/placeholder-poster.png";

  const aiDescription = await fetchAIDescription(movie.id);

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const contributions = await getMovieContributions(movie.id.toString(), userId);

  const grouped: Record<ContributionSection, ContributionWithUser[]> = {
    SYNOPSIS: [],
    FUN_FACTS: [],
    PRODUCTION_CONTEXT: [],
    RECEPTION: [],
    OTHER: [],
  };

  contributions.forEach(c => grouped[c.section].push(c));

  const director = credits.crew.find(member => member.job === "Director");

  const musicPeople = extractMusicPeople(credits.crew);

  return (
    <Container className={`${styles.moviePage} my-2`}>
      {/* 🎬 HERO */}
      <section className="movie-hero mb-2">
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

            {/* LEFT CONTENT */}
            <Col xs={12} md={4} lg={5}>
              <h1 className={`${styles['movie-title']} mb-1`}>{movie.title}</h1>
              {director && <h4 className={`${styles.director} mb-1`}>{director.name}</h4>}
              {movie.release_date && <p className={`${styles.year} mb-3 text-muted`}>({movie.release_date.slice(0, 4)})</p>}
              <p className={styles.textContent}>{movie.overview}</p>
              <ShareButtons title={`${movie.title} — Retro Horror Hub`} />
            </Col>

            {/* RIGHT CONTENT (SPOTIFY) */}
            <Col xs={12} md={3} lg={3} className="d-flex justify-content-center align-items-start">
              
                <SpotifySection movie={movie} credits={credits} />
              
            </Col>
          </Row>
        </Container>
      </section>

      {/* 👥 Cast & Crew */}
      <Row className="mb-5">
        <Col><CastList cast={credits.cast} config={config} /></Col>
        <Col><CrewList crew={credits.crew} /></Col>
      </Row>

      {/* AI Content & Contributions Form */}
      <Row className="mb-5">
        <Col md={6}><AiContent content={aiDescription} /></Col>
        <Col md={6}><ContributionForm movieId={movie.id} /></Col>
      </Row>

      <Row className="mb-5">
        <Col><ContributionList grouped={grouped} /></Col>
      </Row>

      {/* 🎥 Videos */}
      <Row className="mb-5">
        <Col><Suspense fallback={<LoadingBlock height={300} />}>
          <YouTubeSection movie={movie} credits={credits} />
        </Suspense></Col>
      </Row>

      {/* 💿 Merchandise & Streaming + Reddit */}
      <Row className="mb-3">
        <Col md={6}>
          <Row><Col className="pb-3 pb-md-0"><Suspense fallback={<LoadingBlock height={400} />}>
            <EbaySection movie={movie} />
          </Suspense></Col></Row>
        </Col>

        <Col md={6}>
          <Row className="mb-3"><Col><Suspense fallback={<LoadingBlock height={200} />}>
            <DiscogsSection movie={movie} musicPeople={musicPeople} />
          </Suspense></Col></Row>
          <Row className="mb-3"><Col><Suspense fallback={<LoadingBlock height={150} />}>
            <StreamingSection movie={movie} />
          </Suspense></Col></Row>
          <Row><Col><Suspense fallback={<LoadingBlock height={150} />}>
            <RedditSection movie={movie} />
          </Suspense></Col></Row>

          <Row className="mb-3">
            <Col>
              <Suspense fallback={<LoadingBlock height={150} />}>
                <HFSection movie={movie} />
              </Suspense>
            </Col>
          </Row>
        </Col>
        <ShareButtons title={`${movie.title} — Retro Horror Hub`} />
      </Row>
      <BackToTop />
    </Container>
  );
}