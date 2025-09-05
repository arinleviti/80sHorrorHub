import styles from './movies.module.css';
import MovieInfo from './components/movieInfo/movie-info';
import {  slugToIdMap } from '@/app/services/movies';

import { getMovie, getConfiguration, getCredits } from '@/app/services/tmdb';

interface MoviePageProps {
  params: {
    slug: string;
  };
}

export default async function MoviePage({ params }: MoviePageProps) {
    const { slug } = await params; // 👈 must await
  const movieId = slugToIdMap[slug];
  if (!movieId) {
    return <p>Movie not found</p>;
  }

  try {
    // fetch both movie and config in parallel
    const [movie, config, credits] = await Promise.all([
      getMovie(movieId),
      getConfiguration(),
      getCredits(movieId)
    ]);

    return <MovieInfo movie={movie} config={config} credits={credits} />;
  } catch (err) {
    console.error(err);
    return <p>Failed to fetch movie data</p>;
  }
}

