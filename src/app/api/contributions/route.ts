import { NextResponse } from "next/server";
import { prisma } from "@/app/services/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { movieId, section, title, contributionBody } = await req.json();

    if (!movieId || !section || !contributionBody) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const contribution = await prisma.contribution.create({
      data: {
        movieId,
        userId: session.user.id,
        section,
        title: title || null,
        body: contributionBody,
        status: "PENDING",
      },
    });

    return NextResponse.json(contribution);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}