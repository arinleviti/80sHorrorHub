import { prisma } from "@/app/services/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    if (!email || !name) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const cleanedEmail = email.toLowerCase().trim();

    // Upsert: If user exists, update name. If not, create user.
    await prisma.user.upsert({
      where: { email: cleanedEmail },
      update: { name: name },
      create: { 
        email: cleanedEmail, 
        name: name 
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PRE_SIGNUP_ERROR:", error);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }
}