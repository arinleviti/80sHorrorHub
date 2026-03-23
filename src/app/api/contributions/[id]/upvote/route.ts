import { NextResponse } from "next/server";
import { prisma } from "@/app/services/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    // 👉 Try to create the vote
    await prisma.contributionVote.create({
      data: {
        userId: user.id,
        contributionId: params.id,
      },
    });

    // 👉 If successful, increment
    const contribution = await prisma.contribution.update({
      where: { id: params.id },
      data: {
        upvotes: {
          increment: 1,
        },
      },
    });

    return NextResponse.json(contribution);
  }  catch (error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Already voted" },
        { status: 400 }
      );
    }
  }

    return NextResponse.json(
      { error: "Failed to upvote" },
      { status: 500 }
    );
  }
}