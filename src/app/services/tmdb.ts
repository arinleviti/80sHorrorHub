import { prisma } from "@/app/services/prisma";
import { imagekit } from "./imagekit";
import { cache } from 'react';
/* =========================
   TYPES
========================= */

export interface Movie {
  id: string;
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

export interface CastMemberInfo {
  character: string;
  actorName: string;
  profile_path: string | null;
  imagekitProfilePath?: string | null;
}

export interface CrewMemberInfo {
  job: string;
  name: string;
}

interface TMDBCastMember {
  cast_id: number;
  character: string;
  name: string;
  profile_path: string | null;
}

interface TMDBCrewMember {
  job: string;
  name: string;
}

export interface TMDBCredits {
  id: number;
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
}

interface TMDBMovieData {
  id: number;
  title: string;
  release_date: string | null;
  overview: string;
  poster_path: string | null;
  popularity: number;
}

/* =========================
   CONSTANTS
========================= */

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

/* =========================
   FETCH HELPERS
========================= */

async function fetchFromTMDB<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${TMDB_BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}`,
      accept: "application/json",
    },
  });

  if (!res.ok) throw new Error("TMDB fetch failed");
  return (await res.json()) as T;
}

/* =========================
   MAIN FUNCTION
========================= */

export const getMovie = cache(async(movieId: number): Promise<Movie> =>{
  // Check cache
  const cached = await prisma.movie.findUnique({
    where: { tmdbId: movieId },
    include: {
      castMembers: { include: { actor: true }, orderBy: { castOrder: "asc" } },
      crewMembers: true,
    },
  });

  const hasCast = cached && cached.castMembers.length > 0;
  const hasCrew = cached && cached.crewMembers.length > 0;

  // If movie exists AND has cast AND has crew, return from cache
  if (cached && hasCast && hasCrew) {
    console.log(`✅ Using cached data from DB for movie: ${cached.title}`);
    return {
      id: cached.id,
      title: cached.title,
      release_date: cached.releaseDate,
      overview: cached.overview,
      poster_path: cached.posterPath,
      imagekitPosterPath: cached.imagekitPosterPath,
      popularity: cached.popularity,
      cast: cached.castMembers.map((c) => ({
        character: c.character,
        actorName: c.actor?.name ?? "Unknown",
        profile_path: c.actor?.profilePath ?? null,
        imagekitProfilePath: c.actor?.imagekitProfilePath ?? null,
      })),
      crew: cached.crewMembers.map((c) => ({
        name: c.name,
        job: c.job,
      })),
    };
  }

  // Fetch fresh credits from TMDB (always needed at this point)
  console.log(`⬇️ Fetching credits from TMDB for movieId: ${movieId}`);
  const creditsDataRaw = await fetchFromTMDB<TMDBCredits>(`/movie/${movieId}/credits`);
  if (!isTMDBCredits(creditsDataRaw)) throw new Error("Invalid credits data from TMDB");

  let movieRecord = cached;

  // If movie doesn't exist at all, fetch movie data and create it
  if (!cached) {
    console.log(`⬇️ Fetching movie data from TMDB for movieId: ${movieId}`);
    const movieDataRaw = await fetchFromTMDB<TMDBMovieData>(`/movie/${movieId}`);
    if (!isMovie(movieDataRaw)) throw new Error("Invalid movie data from TMDB");

    // Upload poster
    let imagekitPosterUrl: string | null = null;
    if (movieDataRaw.poster_path) {
      console.log("⬆️ Uploading poster to ImageKit");
      const res = await fetch(`https://image.tmdb.org/t/p/w500${movieDataRaw.poster_path}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const upload = await imagekit.upload({
        file: buffer,
        fileName: `poster_${sanitizeFileName(movieDataRaw.title)}.jpg`,
        folder: "/posters",
      });
      imagekitPosterUrl = upload.url;
    }

    movieRecord = await prisma.movie.upsert({
  where: { tmdbId: movieId },
  update: {},
  create: {
    tmdbId: movieId,
    title: movieDataRaw.title,
    releaseDate: movieDataRaw.release_date,
    overview: movieDataRaw.overview,
    posterPath: movieDataRaw.poster_path,
    imagekitPosterPath: imagekitPosterUrl,
    popularity: movieDataRaw.popularity,
  },
  include: { castMembers: { include: { actor: true } }, crewMembers: true },
});
    /* movieRecord = await prisma.movie.create({
      data: {
        tmdbId: movieId,
        title: movieDataRaw.title,
        releaseDate: movieDataRaw.release_date,
        overview: movieDataRaw.overview,
        posterPath: movieDataRaw.poster_path,
        imagekitPosterPath: imagekitPosterUrl,
        popularity: movieDataRaw.popularity,
      },
      include: { castMembers: { include: { actor: true } }, crewMembers: true },
    }); */
  }

  // Fill in missing cast
  const castWithImagekit = [];
  if (!hasCast) {
    console.log(`⬇️ Fetching cast for movie: ${movieRecord!.title}`);
    for (const [i, c] of creditsDataRaw.cast.entries()) {
      const { actor, imagekitUrl } = await getOrCreateActor(c.name, c.profile_path);
      await prisma.castMember.create({
        data: {
          character: c.character,
          actorId: actor.id,
          movieId: movieRecord!.id,
          castOrder: i,
        },
      });
      castWithImagekit.push({
        character: c.character,
        actorName: actor.name,
        profile_path: actor.profilePath,
        imagekitProfilePath: imagekitUrl,
      });
    }
  } else {
    cached!.castMembers.forEach((c) => castWithImagekit.push({
      character: c.character,
      actorName: c.actor?.name ?? "Unknown",
      profile_path: c.actor?.profilePath ?? null,
      imagekitProfilePath: c.actor?.imagekitProfilePath ?? null,
    }));
  }

  // Fill in missing crew
  const crewResult = [];
  if (!hasCrew) {
    console.log(`⬇️ Fetching crew for movie: ${movieRecord!.title}`);
    for (const c of creditsDataRaw.crew) {
      await prisma.crewMember.create({
        data: { name: c.name, job: c.job, movieId: movieRecord!.id },
      });
      crewResult.push({ name: c.name, job: c.job });
    }
  } else {
    cached!.crewMembers.forEach((c) => crewResult.push({ name: c.name, job: c.job }));
  }

  return {
    id: movieRecord!.id,
    title: movieRecord!.title,
    release_date: movieRecord!.releaseDate,
    overview: movieRecord!.overview,
    poster_path: movieRecord!.posterPath,
    imagekitPosterPath: movieRecord!.imagekitPosterPath,
    popularity: movieRecord!.popularity,
    cast: castWithImagekit,
    crew: crewResult,
  };
});

/* =========================
   CONFIG
========================= */

export async function getConfiguration(): Promise<TMDBImageConfig> {
  const data = await fetchFromTMDB<{ images: TMDBImageConfig }>("/configuration");
  return data.images;
}

/* =========================
   TYPE GUARDS
========================= */

function isMovie(data: unknown): data is TMDBMovieData {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.title === "string" &&
    (typeof obj.release_date === "string" || obj.release_date === null) &&
    typeof obj.overview === "string" &&
    (typeof obj.poster_path === "string" || obj.poster_path === null) &&
    typeof obj.popularity === "number"
  );
}

function isTMDBCredits(data: unknown): data is TMDBCredits {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.id === "number" && Array.isArray(obj.cast) && Array.isArray(obj.crew);
}

/* =========================
   HELPERS
========================= */

function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

/* =========================
   ACTOR
========================= */

async function getOrCreateActor(name: string, profilePath: string | null) {
  const sanitized = sanitizeFileName(name);

  let actor = await prisma.actor.findUnique({
    where: { actorNameSanitized: sanitized },
  });

  let imagekitUrl: string | null = actor?.imagekitProfilePath ?? null;

  if (!actor) {
    if (profilePath) {
      const res = await fetch(`https://image.tmdb.org/t/p/w185${profilePath}`);
      const buffer = Buffer.from(await res.arrayBuffer());

      const upload = await imagekit.upload({
        file: buffer,
        fileName: `cast_${sanitized}.jpg`,
        folder: "/cast",
      });

      imagekitUrl = upload.url;
    }

    actor = await prisma.actor.create({
      data: {
        name,
        actorNameSanitized: sanitized,
        profilePath,
        imagekitProfilePath: imagekitUrl,
      },
    });
  }

  return { actor, imagekitUrl };
}