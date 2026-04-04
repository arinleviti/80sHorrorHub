// /api/auth/set-consent-google.ts
import { prisma } from "@/app/services/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { consentPrivacy, consentNewsletter } = await req.json();

    if (consentPrivacy === undefined) {
      return NextResponse.json({ error: "Privacy consent required" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        consentPrivacy,
        consentNewsletter: consentNewsletter ?? false,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err) {
    console.error("SET_CONSENT_ERROR:", err);
    return NextResponse.json({ error: "Failed to update consents" }, { status: 500 });
  }
}