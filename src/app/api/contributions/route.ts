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

   // 1. Get ALL the fields from the frontend
    const { movieId, section, title, body, type, source } = await req.json();

    if (!movieId || !section || !body || !type || !source) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 2. Map them to the Prisma create call
    const contribution = await prisma.contribution.create({
      data: {
        movieId,
        userId: session.user.id,
        section, // This is a ContributionSection enum
        type,    // This is a ContributionType enum
        source,  // This is a ContributionSource enum
        title: title || null,
        body: body, // Ensure this matches the frontend key
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