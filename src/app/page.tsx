'use client';
import Styles from './page.module.css';
import { moviesArray, normalizeSlug } from '@/app/services/movies';
import { useState, useEffect, useRef } from 'react';
import { Container } from 'react-bootstrap';
import Fuse from 'fuse.js';
import React from 'react';

export default function Home() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{ slug: string; id: number; title: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fuse.js setup
  const fuse = new Fuse(moviesArray, {
    keys: ['slug', 'title'],
    threshold: 0.4,
    getFn: (obj, path) => {
      // normalize both title and slug for better fuzzy search
      const value = path === 'slug' ? obj.slug : obj.title;
      return normalizeSlug(value);
    },
  });

  // Live search
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const fuseResults = fuse.search(search.trim());
    setResults(fuseResults.map(r => ({ ...r.item })));
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

  return (
    <div className={Styles.container}>
      <h1 className={Styles.title}>Welcome to 80s Horror Hub</h1>
      <p className={Styles.description}>
        Explore your favorite 80s horror movies, trailers, and collectibles!
      </p>

      <Container className={Styles.searchContainer} style={{ position: 'relative' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for a movie..."
          style={{ padding: '0.5rem', width: '300px' }}
          onFocus={() => search && setShowDropdown(true)}
        />

        {showDropdown && results.length > 0 && (
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              width: '300px',
              backgroundColor: 'white',
              border: '1px solid #ccc',
              zIndex: 10,
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {results.map((r) => (
              <a
                key={r.slug}
                href={`/movies/${r.slug}`}
                style={{
                  display: 'block',
                  padding: '0.5rem',
                  textDecoration: 'none',
                  color: 'black',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                }}
                onClick={() => setShowDropdown(false)}
              >
                {r.title} {/* Show full title instead of slug */}
              </a>
            ))}
          </div>
        )}

        {showDropdown && results.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              width: '300px',
              backgroundColor: 'white',
              border: '1px solid #ccc',
              padding: '0.5rem',
              color: 'red',
            }}
          >
            No results found
          </div>
        )}
      </Container>
    </div>
  );
}