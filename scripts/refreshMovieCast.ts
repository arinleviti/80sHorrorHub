// npx dotenv-cli -- npm run rebuildCast -- <tmdbId>

import { prisma } from "../src/app/services/prisma";
import { imagekit } from "../src/app/services/imagekit";
import fetch from "node-fetch"; // For Node <18
import readline from "readline";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
console.log("Checking Environment Variables...");
console.log("URL Endpoint:", process.env.IMAGEKIT_URL_ENDPOINT ? "✅ Found" : "❌ Missing");
console.log("Private Key:", process.env.IMAGEKIT_PRIVATE_KEY ? "✅ Found" : "❌ Missing");
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

async function deleteImageKitFileById(fileId: string | null) {
  if (!fileId) return;

  try {
    await imagekit.deleteFile(fileId);
    console.log(`🗑️ Deleted ImageKit file: ${fileId}`);
  } catch (err) {
    console.warn("⚠️ Failed to delete ImageKit file:", err);
  }
}

async function getOrCreateActor(name: string, profilePath: string | null) {
  const sanitized = sanitizeFileName(name);

  let actor = await prisma.actor.findUnique({
    where: { actorNameSanitized: sanitized },
  });

  if (!actor) {
    let imagekitUrl: string | null = null;
    let imagekitFileId: string | null = null;

    if (profilePath) {
      const res = await fetch(`https://image.tmdb.org/t/p/w185${profilePath}`);
      const buffer = Buffer.from(await res.arrayBuffer());

      const upload = await imagekit.upload({
        file: buffer,
        fileName: `cast_${sanitized}.jpg`,
        folder: "/cast",
      });

      imagekitUrl = upload.url;
      imagekitFileId = upload.fileId;
    }

    actor = await prisma.actor.create({
      data: {
        name,
        actorNameSanitized: sanitized,
        profilePath,
        imagekitProfilePath: imagekitUrl,
        imagekitProfileFileId: imagekitFileId,
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

  if (!movie) throw new Error(`Movie with TMDB ID ${movieId} not found`);

  console.log(`🔄 Refreshing cast and crew for movie: ${movie.title}`);

  // 1️⃣ Delete cast images (only if actor not in other movies)
  for (const cast of movie.castMembers) {
    const otherCasts = await prisma.castMember.findMany({
      where: { actorId: cast.actorId, movieId: { not: movie.id } },
    });

    if (otherCasts.length === 0) {
      await deleteImageKitFileById(cast.actor.imagekitProfileFileId);
    }
  }

  // 2️⃣ Delete cast & crew rows for this movie
  await prisma.castMember.deleteMany({ where: { movieId: movie.id } });
  await prisma.crewMember.deleteMany({ where: { movieId: movie.id } });

  // 3️⃣ Fetch fresh TMDB credits
  const credits: TMDBCredits = await fetchFromTMDB(`/movie/${movieId}/credits`);

  // 4️⃣ Insert fresh cast
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

  // 5️⃣ Insert fresh crew
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