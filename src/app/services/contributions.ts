import { Contribution, ContributionStatus } from "@prisma/client";
import { prisma } from "@/app/services/prisma";

export async function getMovieContributions(movieId: string): Promise<Contribution[]> {
  return prisma.contribution.findMany({
    where: {
      movieId,
      status: ContributionStatus.APPROVED, // ✅ THIS is the key
    },
    include: {
      user: true, // optional
    },
  });
}