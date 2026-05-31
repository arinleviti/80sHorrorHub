import type { Metadata } from 'next';
import styles from './movies.module.css';
import MovieInfo from './components/movieInfo/movie-info';
import { slugToIdMap } from '@/app/services/movies';

import { getMovie, getConfiguration } from '@/app/services/tmdb';

interface MoviePageProps {
  params: Promise<{
    slug: string;
  }>;
}
export const dynamic = 'force-static';
export async function generateMetadata({ params }: MoviePageProps): Promise<Metadata> {
  const { slug } = await params;
  const movieId = slugToIdMap[slug];
  if (!movieId) return {};

  const movie = await getMovie(movieId);
  console.log("generateMetadata movie:", movie.title, movie.poster_path);
  return {
    title: `${movie.title} (${movie.release_date?.slice(0, 4)}) – Top Collectibles for Sale Now | Retro Horror Hub`,
    description: movie.overview,
    alternates: {
      canonical: `https://retrohorrorhub.com/movies/${slug}`,
    },
    openGraph: {
      title: movie.title,
      description: movie.overview,
      images: movie.imagekitPosterPath
        ? [movie.imagekitPosterPath]
        : movie.poster_path
          ? [`https://image.tmdb.org/t/p/w500${movie.poster_path}`]
          : [],
    },

    twitter: {
      card: "summary_large_image",
      title: movie.title,
      description: movie.overview,
      images: movie.imagekitPosterPath
        ? [movie.imagekitPosterPath]
        : movie.poster_path
          ? [`https://image.tmdb.org/t/p/w500${movie.poster_path}`]
          : [],
    },
  };
}

export default async function MoviePage({ params }: MoviePageProps) {
  const { slug } = await params; // 👈 must await
  const movieId = slugToIdMap[slug];
  if (!movieId) {
    return <p>Movie not found</p>;
  }

  try {
    // Fetch movie (includes cast/crew) and config in parallel
    const [movie, config] = await Promise.all([
      getMovie(movieId),
      getConfiguration(),
    ]);
    // Extract credits from movie
    const credits = {
      id: movieId,
      cast: movie.cast ?? [],
      crew: movie.crew ?? [],
    };
    return (
      <>
        {/* ✅ JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Movie",
              name: movie.title,
              dateCreated: movie.release_date,
              description: movie.overview,
              image: movie.imagekitPosterPath
                ? movie.imagekitPosterPath
                : movie.poster_path
                  ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                  : undefined,
            }),
          }}
        />

        <MovieInfo movie={movie} config={config} credits={credits} />
      </>
    );
  } catch (err) {
    console.error(err);
    return <p>Failed to fetch movie data</p>;
  }
}

