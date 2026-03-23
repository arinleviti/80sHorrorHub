import { prisma } from "@/app/services/prisma";
import { NextResponse } from "next/server";


export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const contributions = await prisma.contribution.findMany({
    where: {
      movieId: params.id,
      status: "APPROVED",
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      upvotes: "desc", // 🔥 important for quality
    },
  });

  return NextResponse.json(contributions);
}