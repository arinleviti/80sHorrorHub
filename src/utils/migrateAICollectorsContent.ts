// to run: npm run migrateCollectors

import { prisma } from "../app/services/prisma";
import path from "path";
import fs from "fs";

const jsonPath = path.join(
  process.cwd(),
  "src/app/services/aiMovieDescriptions_collectors.json"
);
// 1. Add this map at the top of the file, after the imports
const slugOverrides: Record<string, string> = {
  "night-of-the-living-dead-1990": "night-of-the-living-dead-1990",
};
const movieDescriptions = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

type MovieForMatching = {
  id: string;
  title: string;
  slug: string | null;
};

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/3-?d/g, "3d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const wordsA = new Set(a.split(" "));
  const wordsB = new Set(b.split(" "));
  const intersection = [...wordsA].filter((x) => wordsB.has(x));
  return intersection.length / Math.max(wordsA.size, wordsB.size);
}

function romanToArabic(str: string): string {
  return str
    .replace(/\bviii\b/g, "8")
    .replace(/\bvii\b/g, "7")
    .replace(/\bvi\b/g, "6")
    .replace(/\biv\b/g, "4")
    .replace(/\biii\b/g, "3")
    .replace(/\bii\b/g, "2")
    .replace(/\bv\b/g, "5");
}

function arabicToRoman(str: string): string {
  return str
    .replace(/\b8\b/g, "viii")
    .replace(/\b7\b/g, "vii")
    .replace(/\b6\b/g, "vi")
    .replace(/\b5\b/g, "v")
    .replace(/\b4\b/g, "iv")
    .replace(/\b3\b/g, "iii")
    .replace(/\b2\b/g, "ii");
}

// 2. Replace findMatch with this version
function findMatch(allMovies: MovieForMatching[], normalizedSlug: string) {
  // Exact title match first
  const exact = allMovies.find((m) => normalize(m.title) === normalizedSlug);
  if (exact) return exact;

  const direct = allMovies.find((m) => similarity(normalize(m.title), normalizedSlug) >= 0.7);
  if (direct) return direct;

  const slugArabic = romanToArabic(normalizedSlug);
  const arabic = allMovies.find((m) => {
    const t = romanToArabic(normalize(m.title));
    return t === slugArabic || similarity(t, slugArabic) >= 0.7;
  });
  if (arabic) return arabic;

  const slugRoman = arabicToRoman(normalizedSlug);
  const roman = allMovies.find((m) => {
    const t = arabicToRoman(normalize(m.title));
    return t === slugRoman || similarity(t, slugRoman) >= 0.7;
  });

  return roman ?? null;
}

async function main() {
  const allMovies: MovieForMatching[] = await prisma.movie.findMany({
    select: { id: true, title: true, slug: true },
  });

  for (const movieData of movieDescriptions) {
    const { slug, aiDescription } = movieData;
    const normalizedSlug = normalize(slug);

    const dbSlug = slugOverrides[slug] ?? null;
const matchedMovie = dbSlug
  ? allMovies.find((m) => m.slug === dbSlug) ?? null
  : findMatch(allMovies, normalizedSlug);

    if (!matchedMovie) {
      console.warn(`No matching movie found for slug: "${slug}"`);
      continue;
    }

    const existing = await prisma.collectorDescription.findUnique({
      where: { movieId: matchedMovie.id },
    });

    if (existing) {
      console.log(
        `Skipping "${matchedMovie.title}" — Collector description already exists`
      );
      continue;
    }

    try {
      await prisma.collectorDescription.create({
        data: {
          hook: aiDescription.hook,
          identity: aiDescription.identity,
          collectorFocus: aiDescription.collectorFocus,
          context: aiDescription.context,
          movieId: matchedMovie.id,
        },
      });

      console.log(
        `Created Collector description for: "${matchedMovie.title}"`
      );
    } catch (err) {
      console.error(
        `Failed to create Collector description for "${matchedMovie.title}":`,
        err
      );
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });