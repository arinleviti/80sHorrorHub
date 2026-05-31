
import { prisma } from "@/app/services/prisma";

export async function getMovieContributions(movieId: string) {
  return prisma.contribution.findMany({
    where: {
      movieId,
      status: "APPROVED",
    },
    include: {
      user: true,
      votes: true, // 🔥 IMPORTANT
    },
  });
}