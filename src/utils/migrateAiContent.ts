import { PrismaClient } from '../generated/prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
// Load JSON dynamically so compiled JS can find it
const jsonPath = path.resolve(__dirname, '../src/app/services/aiMovieDescriptions.json');
const aiMovieDescriptions = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
// Only fetch the fields we need for matching
type MovieForMatching = { id: string; title: string; slug: string | null };

// Simple helper to normalize strings for matching
function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Optional: compute simple word overlap percentage
function similarity(a: string, b: string): number {
  const wordsA = new Set(a.split(' '));
  const wordsB = new Set(b.split(' '));
  const intersection = [...wordsA].filter(x => wordsB.has(x));
  return intersection.length / Math.max(wordsA.size, wordsB.size);
}

async function main() {
  // Fetch only the necessary movie fields
  const allMovies: MovieForMatching[] = await prisma.movie.findMany({
    select: { id: true, title: true, slug: true },
  });

  for (const movieData of aiMovieDescriptions) {
    const { slug, aiDescription } = movieData;

    const normalizedSlug = normalize(slug);

    // Find best matching movie
    const matchedMovie = allMovies.find(m => {
      const normalizedTitle = normalize(m.title);
      return normalizedTitle === normalizedSlug || similarity(normalizedTitle, normalizedSlug) >= 0.7;
    });

    if (!matchedMovie) {
      console.warn(`No matching movie found for slug: "${slug}"`);
      continue;
    }

     // Upsert AI description: update if exists, create if not
    await prisma.aiDescription.upsert({
      where: { movieId: matchedMovie.id },
      update: {
        ...aiDescription,
      },
      create: {
        ...aiDescription,
        movieId: matchedMovie.id,
      },
    });

    console.log(`Upserted AI description for movie: ${matchedMovie.title}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
