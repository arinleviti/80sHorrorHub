import { prisma } from "@/app/services/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const movies = await prisma.movie.findMany({
      where: { posterPath: { not: null } },
    });
    const randomMovies = movies.sort(() => Math.random() - 0.5);
    return NextResponse.json(randomMovies);
  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.error();
  }
}