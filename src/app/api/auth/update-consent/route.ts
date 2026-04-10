import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/services/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { consentPrivacy, consentNewsletter } = await req.json();

  await prisma.user.update({
    where: { email: session.user.email },
    data: { consentPrivacy, consentNewsletter },
  });

  return NextResponse.json({ success: true });
}