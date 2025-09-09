import styles from './movies.module.css';
import MovieInfo from './components/movieInfo/movie-info';
import {  slugToIdMap } from '@/app/services/movies';

import { getMovie, getConfiguration} from '@/app/services/tmdb';

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
    return <MovieInfo movie={movie} config={config} credits={credits} />;
  } catch (err) {
    console.error(err);
    return <p>Failed to fetch movie data</p>;
  }
}

