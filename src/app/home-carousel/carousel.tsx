'use client';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { EffectCoverflow } from 'swiper/modules';
import Image from 'next/image';
import styles from './carousel.module.css';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { DBMovie } from '../page';
import { rawSlugToIdMap, normalizeSlug } from '@/app/services/movies';

const TMDB_BASE_URL = 'https://image.tmdb.org/t/p/w500';

interface CarouselProps {
  moviesArray: DBMovie[]; // movies fetched from DB with tmdbId
}

export default function MovieCarousel({ moviesArray }: CarouselProps) {
  // Only keep movies that have a poster
  const moviesWithPoster = moviesArray.filter((m) => m.posterPath);

  // Map each movie to include the correct normalized slug
  const slides = moviesWithPoster.map((movie) => {
    // Find the raw slug whose TMDB ID matches this movie
    //Object.entries(rawSlugToIdMap) converts the rawSlugToIdMap object into an array of [rawSlug, id] pairs.
    const rawEntry = Object.entries(rawSlugToIdMap).find(
      ([rawSlug, id]) => id === movie.tmdbId
    );

    // If no matching raw slug found, fallback to a normalized title
    const normalizedSlug = rawEntry
      ? normalizeSlug(rawEntry[0])
      : normalizeSlug(movie.title);
 console.log('Normalized slug for carousel:', normalizedSlug);
    return {
      ...movie,
      slug: normalizedSlug,
    };
  });

  return (
    <div className={styles.carouselWrapper}>
      <Swiper
        modules={[Navigation, EffectCoverflow]}
        effect="coverflow"
        grabCursor={true}
        centeredSlides={true}
        slidesPerView={'auto'}
        slideToClickedSlide={true}
        watchSlidesProgress={true}
        loop={true}
        loopAdditionalSlides={3}
        coverflowEffect={{
          rotate: 0,
          stretch: 0,
          depth: 100,
          modifier: 2,
          slideShadows: false,
        }}
        navigation
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={`${slide.id}-${index}`} style={{ width: 200 }}>
            <a href={`/movies/${slide.slug}`}>
              <Image
                src={slide.imagekitPosterPath ?? (slide.posterPath ? TMDB_BASE_URL + slide.posterPath : '/fallback.jpg')}
                alt={slide.title}
                width={200}
                height={300}
                className={styles.poster}
                onError={(e) => {
    const target = e.currentTarget;
    // If ImageKit fails, try TMDB
    if (slide.posterPath && !target.src.includes('tmdb.org')) {
      target.src = `${TMDB_BASE_URL}${slide.posterPath}`;
    } else {
      target.src = '/fallback.jpg';
    }
  }}
              />
            </a>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}