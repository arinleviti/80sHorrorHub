// src/app/api/admin/contributions/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/app/services/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  try {
    await requireAdmin();

    const contributions = await prisma.contribution.findMany({
      where: { status: "PENDING" },
      include: {
        user: { select: { name: true } },
        movie: true,
      },
    });

    return NextResponse.json(contributions);
  } catch (err) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}