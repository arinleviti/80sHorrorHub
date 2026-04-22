import { prisma } from "@/app/services/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const where = { posterPath: { not: null } };

    const total = await prisma.movie.count({ where });

    if (total === 0) return NextResponse.json([]);

    const randomSkip = Math.floor(Math.random() * total);

    const firstBatch = await prisma.movie.findMany({
      where,
      take: 40,
      skip: randomSkip,
      orderBy: { id: "asc" },
    });

    let movies = firstBatch;

    // Wrap around if we didn't get 40
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

    return NextResponse.json(movies);
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.error();
  }
}