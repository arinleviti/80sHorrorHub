'use client';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import Image from 'next/image';
import styles from './carousel.module.css';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { DBMovie } from '../page';
import { normalizeSlug } from '@/app/services/movies';
import { EffectCoverflow } from 'swiper/modules';
const TMDB_BASE_URL = 'https://image.tmdb.org/t/p/w500';

interface CarouselProps {
  moviesArray: DBMovie[];
}

export default function MovieCarousel({ moviesArray }: CarouselProps) {
  // Only keep movies that have poster_path
  const moviesWithPoster = moviesArray.filter((m) => m.posterPath);

  return (
    <div className={styles.carouselWrapper}>
      <Swiper
        modules={[Navigation, EffectCoverflow]}
        effect="coverflow"
        grabCursor={true}
        centeredSlides={true}
        slidesPerView={'auto'}
        slideToClickedSlide={true}
        watchSlidesProgress={true} // Aiuta a gestire la visibilità dei cloni
        loop={true}
  loopAdditionalSlides={3}
        coverflowEffect={{
          rotate: 0,
          stretch: 0,
          depth: 100,
          modifier: 2,
          slideShadows: false, // we will use opacity
        }}
        loop={true}
        navigation
      >
        {moviesWithPoster.map((movie) => {
          const slug = normalizeSlug(movie.title); // compute slug here
          return (
            <SwiperSlide key={slug} style={{ width: 200 }}>
              <a href={`/movies/${slug}`}>
                <Image
                  src={movie.posterPath ? TMDB_BASE_URL + movie.posterPath : '/fallback.jpg'}
                  alt={movie.title}
                  width={200}
                  height={300}
                  className={styles.poster}
                />
              </a>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}