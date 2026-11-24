// Film background for section 1, read-only from the existing CollectorDescription / AiDescription tables.
import { prisma } from "../../app/services/prisma";
import type { FilmBackground } from "./writer";

export async function readFilmBackground(movieId: string): Promise<FilmBackground | null> {
  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: { title: true, releaseDate: true, collectorDescription: true, aiDescription: true },
  });
  const collector = movie?.collectorDescription;
  if (!movie || !collector) return null;

  return {
    title: movie.title,
    year: movie.releaseDate?.slice(0, 4) ?? "",
    hook: collector.hook,
    identity: collector.identity,
    collectorFocus: collector.collectorFocus,
    context: collector.context,
    productionContext: movie.aiDescription?.productionContext ?? null,
    reception: movie.aiDescription?.reception ?? null,
  };
}
