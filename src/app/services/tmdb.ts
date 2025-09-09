import { PrismaClient } from '../../generated/prisma/client';
const prisma = new PrismaClient();
export interface Movie {
  title: string;
  release_date: string | null;
  overview: string;
  poster_path: string | null;
  popularity: number;
  cast?: CastMember[];
  crew?: CrewMember[];
}

export interface TMDBImageConfig {
  secure_base_url: string;
  poster_sizes: string[];
}
interface CastMember {
  cast_id: number;
  character: string;
  name: string;
  profile_path: string | null;
}

interface CrewMember {
  job: string;
  name: string;
}

export interface MovieCredits {
  id: number;
  cast: CastMember[];
  crew: CrewMember[];
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function fetchFromTMDB<T>(endpoint: string): Promise<T> {

  const res = await fetch(`${TMDB_BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}`,
      accept: 'application/json',
    },
  });

  if (!res.ok) throw new Error('TMDB fetch failed');

  const data: unknown = await res.json();
  return data as T; // safe once validated
}


// Get a movie by ID
export async function getMovie(movieId: number): Promise<Movie> {
  const cached = await prisma.movie.findUnique({ 
    where: { tmdbId: movieId },
    include: { castMembers: true, crewMembers: true }
  });
  if (cached) {
    const data: Movie = {
      title: cached.title,
      release_date: cached.releaseDate,
      overview: cached.overview,
      poster_path: cached.posterPath,
      popularity: cached.popularity,
       cast: cached.castMembers.map(c => ({
        cast_id: c.castId,
        name: c.name,
        character: c.character,
        profile_path: c.profilePath,
      })),
      crew: cached.crewMembers.map(c => ({
        name: c.name,
        job: c.job,
      })),
    };
    console.log("Using cached TMDB data for movie:", cached.title);
    return data;
  }
  // Fetch movie + credits from TMDB in parallel
  const [movieDataRaw, creditsDataRaw] = await Promise.all([
    fetchFromTMDB<unknown>(`/movie/${movieId}`),
    fetchFromTMDB<unknown>(`/movie/${movieId}/credits`),
  ]);
  if (!isMovie(movieDataRaw)) throw new Error('Invalid movie data from TMDB');
  if (!isMovieCredits(creditsDataRaw)) throw new Error('Invalid credits data from TMDB');

 
  // (we only create, no update needed)
  const movieRecord = await prisma.movie.create({
    data: {
      tmdbId: movieId,
      title: movieDataRaw.title,
      releaseDate: movieDataRaw.release_date,
      overview: movieDataRaw.overview,
      posterPath: movieDataRaw.poster_path,
      popularity: movieDataRaw.popularity,
    },
  });

   // 4️⃣ Create cast members
  for (const c of creditsDataRaw.cast) {
    await prisma.castMember.create({
      data: {
        castId: c.cast_id,
        name: c.name,
        character: c.character,
        profilePath: c.profile_path,
        movieId: movieRecord.id,
      },
    });
  }

  // 5️⃣ Create crew members
  for (const c of creditsDataRaw.crew) {
    await prisma.crewMember.create({
      data: {
        name: c.name,
        job: c.job,
        movieId: movieRecord.id,
      },
    });
  }

// Return consistent Movie object
  return {
    title: movieRecord.title,
    release_date: movieRecord.releaseDate,
    overview: movieRecord.overview,
    poster_path: movieRecord.posterPath,
    popularity: movieRecord.popularity,
    cast: creditsDataRaw.cast,
    crew: creditsDataRaw.crew,
  };
}

// Get global configuration (image base URLs, sizes, etc.)
export async function getConfiguration(): Promise<TMDBImageConfig> {
  const data = await fetchFromTMDB<{ images: TMDBImageConfig }>("/configuration");

  return data.images; // only need the images object
}
//data is Movie → This is a special TypeScript return type called a type predicate.
//It tells TypeScript: “If this function returns true, then data can safely be treated as a Movie.”
function isMovie(data: unknown): data is Movie {
  //Rejects primitives like strings, numbers, booleans.
  if (typeof data !== 'object' || data === null) return false;
  //This tells TypeScript: treat obj as a dictionary where keys are strings and values are unknown.
  const obj = data as Record<string, unknown>;

  return (
    typeof obj.title === 'string' &&
    typeof obj.release_date === 'string' &&
    typeof obj.overview === 'string' &&
    (typeof obj.poster_path === 'string' || obj.poster_path === null) &&
    typeof obj.popularity === 'number'
  );
}
/* function isMovieCredits(data: unknown): data is MovieCredits {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  return (
  } */

export async function getCredits(movieId: number): Promise<MovieCredits> {
  const data = await fetchFromTMDB<unknown>(`/movie/${movieId}/credits`);
  if (!isMovieCredits(data)) throw new Error('Invalid movie credits data');
  return data;
}

function isMovieCredits(data: unknown): data is MovieCredits {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  return (
    typeof obj.id === 'number' &&
    Array.isArray(obj.cast) &&
    obj.cast.every((element) => isCastMember(element)) &&
    Array.isArray(obj.crew) &&
    obj.crew.every((element) => isCrewMember(element))
  );
}
function isCastMember(data: unknown): data is CastMember {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  return (
    typeof obj.cast_id === 'number' &&
    typeof obj.character === 'string' &&
    typeof obj.name === 'string' &&
    (typeof obj.profile_path === 'string' || obj.profile_path === null)
  );
}
function isCrewMember(data: unknown): data is CrewMember {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  return (
    typeof obj.job === 'string' &&
    typeof obj.name === 'string'
  );
}