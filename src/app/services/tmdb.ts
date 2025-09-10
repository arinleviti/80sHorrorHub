import { PrismaClient } from '../../generated/prisma/client';
import { imagekit } from './imagekit';
const prisma = new PrismaClient();
export interface Movie {
  title: string;
  release_date: string | null;
  overview: string;
  poster_path: string | null;
  imagekitPosterPath?: string | null;
  popularity: number;
  cast?: CastMemberInfo[];
  crew?: CrewMemberInfo[];
}

export interface TMDBImageConfig {
  secure_base_url: string;
  poster_sizes: string[];
}
interface CastMemberInfo {
  character: string;
  actorName: string;
  profile_path: string | null;
  imagekitProfilePath?: string | null;
}

interface CrewMemberInfo {
  job: string;
  name: string;
}

export interface MovieCredits {
  id: number;
  cast: CastMemberInfo[];
  crew: CrewMemberInfo[];
}
interface TMDBCastMember {
  cast_id: number;
  character: string;
  name: string;         // <-- TMDB field
  profile_path: string | null;
}
// TMDB API crew type
interface TMDBCrewMember {
  job: string;
  name: string;
}

interface TMDBCredits {
  id: number;
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
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
    include: { castMembers: { include: { actor: true } }, crewMembers: true }

  });
  if (cached) {
    const data: Movie = {
      title: cached.title,
      release_date: cached.releaseDate,
      overview: cached.overview,
      poster_path: cached.posterPath,
      imagekitPosterPath: cached.imagekitPosterPath,
      popularity: cached.popularity,
      cast: cached.castMembers.map(c => ({
        character: c.character,
        actorName: c.actor.name,
        profile_path: c.actor.profilePath,
        imagekitProfilePath: c.actor.imagekitProfilePath
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
    fetchFromTMDB<TMDBCredits>(`/movie/${movieId}/credits`),
  ]);
  if (!isMovie(movieDataRaw)) throw new Error('Invalid movie data from TMDB');
  if (!isTMDBCredits(creditsDataRaw)) throw new Error('Invalid credits data from TMDB');

  
  //Upload poster to ImageKit if available
  let imagekitPosterUrl: string | null = null;
  if (movieDataRaw.poster_path) {
    const posterRes = await fetch(`https://image.tmdb.org/t/p/w500${movieDataRaw.poster_path}`);
    const posterBuffer = Buffer.from(await posterRes.arrayBuffer());
    const safeName = sanitizeFileName(movieDataRaw.title);
    const uploadResult = await imagekit.upload({
      file: posterBuffer,
      fileName: `poster_${safeName}.jpg`,
      folder: "/posters",
    });
    imagekitPosterUrl = uploadResult.url;
    console.log("Uploaded poster to ImageKit:", uploadResult.url);

  }

  // 4️⃣ Create movie record
  const movieRecord = await prisma.movie.create({
    data: {
      tmdbId: movieId,
      title: movieDataRaw.title,
      releaseDate: movieDataRaw.release_date,
      overview: movieDataRaw.overview,
      posterPath: movieDataRaw.poster_path,
      imagekitPosterPath: imagekitPosterUrl,
      popularity: movieDataRaw.popularity,
    },
  });

 
  const castWithImagekit: CastMemberInfo[] = [];

// 🔹 NEW START: Upload cast images only if needed
for (const c of creditsDataRaw.cast) {
  const { actor, imagekitUrl } = await getOrCreateActor(c.name, c.profile_path);

  await prisma.castMember.create({
    data: {
       character: c.character,
       //actorId: actor.id This ensures all cast members referring to the same actor use the same actor.id.
       //So Actor is created only once, and multiple CastMembers can point to it.
        actorId: actor.id,
        movieId: movieRecord.id,
    },
  });

  castWithImagekit.push({
    character: c.character,
      actorName: actor.name,
      profile_path: actor.profilePath,
      imagekitProfilePath: imagekitUrl,
  });
}
// 🔹 NEW END
  // 6️⃣ Create crew members
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
    cast: castWithImagekit,
    crew: creditsDataRaw.crew.map(c => ({ name: c.name, job: c.job })),
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


/* export async function getCredits(movieId: number): Promise<MovieCredits> {
  const data = await fetchFromTMDB<unknown>(`/movie/${movieId}/credits`);
  if (!isMovieCredits(data)) throw new Error('Invalid movie credits data');
  return data;
} */
function isTMDBCastMember(data: unknown): data is TMDBCastMember {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.cast_id === 'number' &&
    typeof obj.character === 'string' &&
    typeof obj.name === 'string' &&
    (typeof obj.profile_path === 'string' || obj.profile_path === null)
  );
}

function isTMDBCrewMember(data: unknown): data is TMDBCrewMember {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.job === 'string' && typeof obj.name === 'string';
}
//If this function returns true, then data should be treated as a TMDBCredits object.
function isTMDBCredits(data: unknown): data is TMDBCredits {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'number' &&
    Array.isArray(obj.cast) &&
    obj.cast.every(isTMDBCastMember) &&
    Array.isArray(obj.crew) &&
    obj.crew.every(isTMDBCrewMember)
  );
}

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')        // spaces → underscores
    .replace(/[^a-z0-9_]/g, ''); // remove special chars
}


// Create or reuse Actor, upload profile if needed
async function getOrCreateActor(name: string, profilePath: string | null) {
  const sanitizedName = sanitizeFileName(name);

  let actor = await prisma.actor.findUnique({
    where: { actorNameSanitized: sanitizedName }
  });

  let imagekitUrl: string | null = actor?.imagekitProfilePath || null;

  if (!actor) {
    // Upload image if available
    if (profilePath) {
      const profileRes = await fetch(`https://image.tmdb.org/t/p/w185${profilePath}`);
      const profileBuffer = Buffer.from(await profileRes.arrayBuffer());

      const uploadResult = await imagekit.upload({
        file: profileBuffer,
        fileName: `cast_${sanitizedName}.jpg`, // no random appendix
        folder: "/cast",
      });

      imagekitUrl = uploadResult.url;
    }

    actor = await prisma.actor.create({
      data: {
        name,
        actorNameSanitized: sanitizedName,
        profilePath,
        imagekitProfilePath: imagekitUrl,
      },
    });
  }

  return { actor, imagekitUrl };
}