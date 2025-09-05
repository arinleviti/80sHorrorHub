'use client';
import Styles from './page.module.css';
import {slugToIdMap} from '@/app/services/movies';
import { useState} from 'react';
import {Button, Form, Container, } from 'react-bootstrap';
import React from 'react';


export default function Home() {
const [search, setSearch] = useState('');
const [resultFound, setResultFound] = useState(false);  
const [slug, setSlug] = useState<string | null>(null);

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // Normalize input: trim, lowercase, replace spaces with hyphens
  const normalizedSearch = search.trim().toLowerCase().replace(/\s+/g, '-');
  const movieId = slugToIdMap[normalizedSearch];
  if (movieId) {
    setResultFound(true);
     setSlug(normalizedSearch); 
    console.log('Searching for:', search);
  } else {
    setResultFound(false);
    setSlug(null);
    console.log('Movie not found:', search);
  }
}
  return (
    <div className={Styles.container}>
      <h1 className={Styles.title}>Welcome to 80s Horror Hub</h1>
      <p className={Styles.description}>Explore your favorite 80s horror movies, trailers, and collectibles!</p>

      <Container className={Styles.searchContainer}>
       <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search for a movie..."
          style={{ padding: '0.5rem', width: '300px' }}
        />
        <button
          type="submit"
          style={{
            padding: '0.5rem 1rem',
            marginLeft: '0.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Search
        </button>
      </form>
      </Container>
          {resultFound && (
            <Button href={`/movies/${slug}`} variant="primary" style={{ marginTop: '1rem' }}>
              Go to Movie Page
            </Button>
          )}
    </div>
  );
}