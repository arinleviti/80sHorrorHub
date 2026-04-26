//to run: npx prisma db seed
import { prisma } from "../app/services/prisma";
import path from 'path';
import fs from 'fs';

// Load JSON dynamically so compiled JS can find it
const jsonPath = path.join(process.cwd(), 'src/app/services/aiMovieDescriptions.json');
const aiMovieDescriptions = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

type MovieForMatching = { id: string; title: string; slug: string | null };

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/3-?d/g, '3d')        // "3-D", "3D" → "3d"
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function similarity(a: string, b: string): number {
  const wordsA = new Set(a.split(' '));
  const wordsB = new Set(b.split(' '));
  const intersection = [...wordsA].filter(x => wordsB.has(x));
  return intersection.length / Math.max(wordsA.size, wordsB.size);
}

function romanToArabic(str: string): string {
  return str
    .replace(/\bviii\b/g, '8')
    .replace(/\bvii\b/g, '7')
    .replace(/\bvi\b/g, '6')
    .replace(/\biv\b/g, '4')
    .replace(/\biii\b/g, '3')
    .replace(/\bii\b/g, '2')
    .replace(/\bv\b/g, '5');
}

function arabicToRoman(str: string): string {
  return str
    .replace(/\b8\b/g, 'viii')
    .replace(/\b7\b/g, 'vii')
    .replace(/\b6\b/g, 'vi')
    .replace(/\b5\b/g, 'v')
    .replace(/\b4\b/g, 'iv')
    .replace(/\b3\b/g, 'iii')
    .replace(/\b2\b/g, 'ii');
}

function findMatch(allMovies: MovieForMatching[], normalizedSlug: string): MovieForMatching | null {
  // Attempt 1: direct match
  const direct = allMovies.find(m => {
    const t = normalize(m.title);
    return t === normalizedSlug || similarity(t, normalizedSlug) >= 0.7;
  });

  if (direct) return direct;

  // Attempt 2: roman → arabic on both sides
  const slugArabic = romanToArabic(normalizedSlug);
  const arabic = allMovies.find(m => {
    const t = romanToArabic(normalize(m.title));
    return t === slugArabic || similarity(t, slugArabic) >= 0.7;
  });
  if (arabic) return arabic;

  // Attempt 3: arabic → roman on both sides
  const slugRoman = arabicToRoman(normalizedSlug);
  const roman = allMovies.find(m => {
    const t = arabicToRoman(normalize(m.title));
    return t === slugRoman || similarity(t, slugRoman) >= 0.7;
  });
  return roman ?? null;
}

async function main() {
  const allMovies: MovieForMatching[] = await prisma.movie.findMany({
    select: { id: true, title: true, slug: true },
  });

  for (const movieData of aiMovieDescriptions) {
    const { slug, aiDescription } = movieData;
    const normalizedSlug = normalize(slug);

    const matchedMovie = findMatch(allMovies, normalizedSlug);

    if (!matchedMovie) {
      console.warn(`No matching movie found for slug: "${slug}"`);
      continue;
    }

    const existing = await prisma.aiDescription.findUnique({
      where: { movieId: matchedMovie.id },
    });

    if (existing) {
      console.log(`Skipping "${matchedMovie.title}" — AI description already exists`);
      continue;
    }

    try {
      await prisma.aiDescription.create({
        data: {
          ...aiDescription,
          movieId: matchedMovie.id,
        },
      });
      console.log(`Created AI description for: "${matchedMovie.title}"`);
    } catch (err) {
      console.error(`Failed to create AI description for "${matchedMovie.title}":`, err);
    }
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