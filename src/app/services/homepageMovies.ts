import { prisma } from "@/app/services/prisma";

export async function getHomepageMovies() {
  const where = { posterPath: { not: null } };

  const total = await prisma.movie.count({ where });

  if (total === 0) return [];

  const randomSkip = Math.floor(Math.random() * total);

  const firstBatch = await prisma.movie.findMany({
    where,
    take: 40,
    skip: randomSkip,
    orderBy: { id: "asc" },
  });

  let movies = firstBatch;

  if (firstBatch.length < 40) {
    const remaining = 40 - firstBatch.length;

    const secondBatch = await prisma.movie.findMany({
      where,
      take: remaining,
      skip: 0,
      orderBy: { id: "asc" },
    });

    movies = [...firstBatch, ...secondBatch];
  }

  return movies;
}