
import { getHomepageMovies } from '@/app/services/homepageMovies';
import Styles from './page.module.css';
import MovieCarousel from './home-carousel/carousel';
import LoadingBlock from './LoadingBlock/loading-block';
export const dynamic = 'force-dynamic';

export type DBMovie = {
  id: string;
  tmdbId?: number;
  title: string;
  imagekitPosterPath?: string | null;
  overview: string;
  releaseDate: string | null;
  posterPath: string | null;
  slug?: string | null;
  popularity: number;
};

export default async function Home() {
  const data = await getHomepageMovies();

  const formatted = data.map(m => ({
    id: m.id,
    tmdbId: m.tmdbId,
    title: m.title,
    overview: m.overview,
    releaseDate: m.releaseDate,
    posterPath: m.posterPath,
    imagekitPosterPath: m.imagekitPosterPath,
    slug: m.slug ?? m.title.toLowerCase().replace(/\s+/g, '-'),
    popularity: m.popularity,
  }));

  return (
    <div className={Styles.container}>
      <h1 className={Styles.title}>RETRO HORROR HUB</h1>

      {formatted.length === 0 ? (
        <LoadingBlock height={300} />
      ) : (
        <MovieCarousel moviesArray={formatted} />
      )}
    </div>
  );
}