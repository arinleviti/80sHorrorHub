'use client';
import Styles from './page.module.css';
import { moviesArray, Movie } from '@/app/services/movies';
import { useState, useEffect, useRef } from 'react';
import { Container } from 'react-bootstrap';
import Fuse from 'fuse.js';
import React from 'react';
import MovieCarousel from './home-carousel/carousel';

export type DBMovie = {
  id: string;
  title: string;
  overview: string;
  releaseDate: string | null;
  posterPath: string | null;
  slug?: string | null;
  popularity: number;
};

export default function Home() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{ slug: string; id: number; title: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
   const [mapped, setMovies] = useState<DBMovie[]>([]);
  // Fuse.js setup
  const fuse = new Fuse(moviesArray, {
    keys: ['slug', 'title'],
    threshold: 0.4,
    getFn: (obj, path) => (path === 'slug' ? obj.slug : obj.title),
  });

  // Live search
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const fuseResults = fuse.search(search.trim());
    setResults(fuseResults.map((r) => ({ ...r.item })));
    setShowDropdown(true);
  }, [search]);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  

  useEffect(() => {
    fetch('/api/homepageMovies')
      .then((res) => res.json())
      .then((data: DBMovie[]) => {
        // Map fields to match the Movie type used by the carousel
      const mapped :DBMovie[] = data.map(m => ({
         id: m.id,
        title: m.title,
        overview: m.overview,
        releaseDate: m.releaseDate,
        posterPath: m.posterPath,
        slug: m.slug ?? m.title.toLowerCase().replace(/\s+/g, '-'),
        popularity: m.popularity,
      }));
        console.log('Fetched movies:', mapped);
        setMovies(mapped);
      })
      .catch((err) => console.error('Error fetching movies:', err));
  }, []);
  return (
    <div className={Styles.container}>
      <h1 className={Styles.title}>RETRO HORROR HUB</h1>

      <Container className={Styles.searchContainer} style={{ position: 'relative' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search the archive..."
          className={Styles.searchInputMain}
          onFocus={() => search && setShowDropdown(true)}
        />

        {showDropdown && results.length > 0 && (
          <div ref={dropdownRef} className={Styles.searchDropdown}>
            {results.map((r) => (
              <a
                key={r.slug}
                href={`/movies/${r.slug}`}
                className={Styles.searchItem}
                onClick={() => setShowDropdown(false)}
              >
                {r.title}
              </a>
            ))}
          </div>
        )}

        {showDropdown && results.length === 0 && (
          <div className={Styles.noResults}>No results found</div>
        )}
      </Container>

      {/* Carousel */}
      <div className={Styles.carouselWrapper}>
  {mapped.length > 0 && <MovieCarousel moviesArray={mapped} />}
</div>
    </div>
  );
}