import { prisma } from "@/app/services/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, name, consentPrivacy, consentNewsletter } = await req.json();

    if (!email || !name) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (consentPrivacy === undefined) {
      return NextResponse.json({ error: "Privacy consent is required" }, { status: 400 });
    }

    const cleanedEmail = email.toLowerCase().trim();

    // Upsert: If user exists, update name + consents. If not, create user with consents.
    await prisma.user.upsert({
      where: { email: cleanedEmail },
      update: {
        name,
        consentPrivacy,
        consentNewsletter: consentNewsletter ?? false,
      },
      create: { 
        email: cleanedEmail, 
        name,
        consentPrivacy,
        consentNewsletter: consentNewsletter ?? false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PRE_SIGNUP_ERROR:", error);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }
}