import { prisma } from "@/app/services/prisma";

const FEATURED_TMDB_IDS: number[] = [
  11797, // The Shining
];

export async function getHomepageMovies() {
  const where = { posterPath: { not: null } };

  let featured: Awaited<ReturnType<typeof prisma.movie.findMany>> = [];
  if (FEATURED_TMDB_IDS.length > 0) {
    const found = await prisma.movie.findMany({
      where: { ...where, tmdbId: { in: FEATURED_TMDB_IDS } },
    });
    const byId = new Map(found.map(m => [m.tmdbId, m]));
    featured = FEATURED_TMDB_IDS.map(id => byId.get(id)).filter(
      (m): m is NonNullable<typeof m> => Boolean(m)
    );
  }

  const remainingSlots = 40 - featured.length;
  const featuredIds = featured.map(m => m.tmdbId);

  const rest = remainingSlots > 0
    ? await prisma.movie.findMany({
        where: { ...where, tmdbId: { notIn: featuredIds } },
        take: remainingSlots,
        orderBy: { id: "asc" },
      })
    : [];

  return [...featured, ...rest];
}