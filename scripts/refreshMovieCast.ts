//npx dotenv-cli -- npm run rebuildCast -- 10014

import { prisma } from "../src/app/services/prisma";
import { imagekit } from "../src/app/services/imagekit";
import fetch from "node-fetch"; // For Node <18
import readline from "readline";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// -----------------------------
// TYPES
// -----------------------------
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

interface TMDBCredits {
  id: number;
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
}

// -----------------------------
// HELPERS
// -----------------------------
function sanitizeFileName(name: string) {
  return name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

async function fetchFromTMDB<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${TMDB_BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_BEARER_TOKEN}`,
      accept: "application/json",
    },
  });

  if (!res.ok) throw new Error(`TMDB fetch failed: ${res.statusText}`);
  return (await res.json()) as T;
}

async function deleteImageKitFile(urlOrPath: string | null) {
  if (!urlOrPath) return;

  try {
    let filePath = urlOrPath;

    // If it’s a full URL, extract the pathname
    if (urlOrPath.startsWith("http")) {
      const parsed = new URL(urlOrPath);
      filePath = parsed.pathname.replace(/^\//, ""); // remove leading slash
    }

    await imagekit.deleteFile(filePath);
    console.log(`🗑️ Deleted ImageKit file: ${filePath}`);
  } catch (err) {
    console.warn("⚠️ Failed to delete ImageKit file:", err);
  }
}

async function getOrCreateActor(name: string, profilePath: string | null) {
  const sanitized = sanitizeFileName(name);

  let actor = await prisma.actor.findUnique({
    where: { actorNameSanitized: sanitized },
  });

  let imagekitUrl: string | null = actor?.imagekitProfilePath || null;

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

  return { actor };
}

// -----------------------------
// MAIN FUNCTION
// -----------------------------
async function refreshMovieCast(movieId: number) {
  const movie = await prisma.movie.findUnique({
    where: { tmdbId: movieId },
    include: { castMembers: { include: { actor: true } }, crewMembers: true },
  });

  if (!movie) {
    throw new Error(`Movie with TMDB ID ${movieId} not found`);
  }

  console.log(`🔄 Refreshing cast and crew for movie: ${movie.title}`);

  // 1️⃣ Delete movie poster if exists
  await deleteImageKitFile(movie.imagekitPosterPath);

  // 2️⃣ Delete cast images (only if actor not in other movies)
  for (const cast of movie.castMembers) {
    const otherCasts = await prisma.castMember.findMany({
      where: { actorId: cast.actorId, movieId: { not: movie.id } },
    });
    if (otherCasts.length === 0) {
      await deleteImageKitFile(cast.actor.imagekitProfilePath);
    }
  }

  // 3️⃣ Delete cast & crew rows for this movie
  await prisma.castMember.deleteMany({ where: { movieId: movie.id } });
  await prisma.crewMember.deleteMany({ where: { movieId: movie.id } });

  // 4️⃣ Fetch fresh TMDB credits
  const credits: TMDBCredits = await fetchFromTMDB(`/movie/${movieId}/credits`);

  // 5️⃣ Upload new poster
  if (movie.posterPath) {
    const res = await fetch(`https://image.tmdb.org/t/p/w500${movie.posterPath}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const upload = await imagekit.upload({
      file: buffer,
      fileName: `poster_${sanitizeFileName(movie.title)}.jpg`,
      folder: "/posters",
    });

    await prisma.movie.update({
      where: { id: movie.id },
      data: { imagekitPosterPath: upload.url },
    });
  }

  // 6️⃣ Insert fresh cast
  for (let i = 0; i < credits.cast.length; i++) {
    const c = credits.cast[i];
    const { actor } = await getOrCreateActor(c.name, c.profile_path);

    await prisma.castMember.create({
      data: {
        character: c.character,
        actorId: actor.id,
        movieId: movie.id,
        castOrder: i,
      },
    });
  }

  // 7️⃣ Insert fresh crew
  for (const c of credits.crew) {
    await prisma.crewMember.create({
      data: {
        name: c.name,
        job: c.job,
        movieId: movie.id,
      },
    });
  }

  console.log(`✅ Refresh complete for ${movie.title}`);
}

// -----------------------------
// CLI
// -----------------------------
async function main() {
  const movieIdArg = process.argv[2];
  let movieId: number;

  if (movieIdArg) {
    movieId = Number(movieIdArg);
    if (isNaN(movieId)) {
      console.error("⚠️ Invalid TMDB ID provided");
      process.exit(1);
    }
  } else {
    // Interactive prompt
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    movieId = await new Promise<number>((resolve) => {
      rl.question("Enter TMDB movie ID to refresh: ", (answer) => {
        rl.close();
        resolve(Number(answer));
      });
    });
  }

  await refreshMovieCast(movieId);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});