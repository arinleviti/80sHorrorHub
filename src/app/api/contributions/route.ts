import { NextResponse } from "next/server";
import { prisma } from "@/app/services/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    //Is the user logged in?
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { movieId, section, title, contributionBody } = body;

    if (!movieId || !section || !contributionBody) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const contribution = await prisma.contribution.create({
      data: {
        movieId,
        userId: user.id,
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