'use client';

import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, EffectCoverflow } from 'swiper/modules';
import Image from 'next/image';
import styles from './carousel.module.css';
import 'swiper/css';
import 'swiper/css/navigation';

import { DBMovie } from '../page';
import { rawSlugToIdMap, normalizeSlug } from '@/app/services/movies';
import { usePathname } from 'next/navigation';

const TMDB_BASE_URL = 'https://image.tmdb.org/t/p/w500';

interface CarouselProps {
  moviesArray: DBMovie[];
}
const idToSlug = Object.fromEntries(
  Object.entries(rawSlugToIdMap).map(([slug, id]) => [id, slug])
);
//1. Start with object: `{ "the-fog": 790 }`
//2. Transform to array of arrays: `[["the-fog", 790]]`
//3. Swap key/value: `[[790, "the-fog"]]`
//4. Transform back to object: `{ 790: "the-fog" }`
export default function MovieCarousel({ moviesArray }: CarouselProps) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const slides = moviesArray
    .filter((m) => m.posterPath)
    .map((movie) => {
      const slug = movie.tmdbId && idToSlug[movie.tmdbId]
        ? normalizeSlug(idToSlug[movie.tmdbId])
        : normalizeSlug(movie.title);
      return { ...movie, slug };
    });

  return (
    <div
      className={styles.carouselWrapper}
      style={{ opacity: ready ? 1 : 0 }}
    >

      <Swiper
        key={pathname}
        modules={[Navigation, EffectCoverflow]}
        effect="coverflow"
        grabCursor={true}
        initialSlide={Math.floor(slides.length / 2)}
        centeredSlides={true}
        slidesPerView={3}
        breakpoints={{
          640: {
            slidesPerView: 5,
          },
        }}
        centeredSlidesBounds={true}
        loop={false}
        loopAdditionalSlides={slides.length}
        slideToClickedSlide={true}
        coverflowEffect={{
          rotate: 0,
          stretch: 0,
          depth: 100,
          modifier: 2,
          slideShadows: false,
        }}
        navigation
        onSwiper={() => {
          setTimeout(() => setReady(true), 50);
        }}
      >
        {slides.map((slide) => (
          <SwiperSlide key={`${slide.id}`}>
            <a href={`/movies/${slide.slug}`} className={styles.slideLink}>
              <Image
                src={
                  slide.imagekitPosterPath ??
                  (slide.posterPath
                    ? TMDB_BASE_URL + slide.posterPath
                    : '/fallback.jpg')
                }
                alt={slide.title}
                fill
                sizes="200px"
                className={styles.poster}
              />
            </a>
          </SwiperSlide>
        ))}
      </Swiper>

    </div>
  );
}