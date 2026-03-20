import { NextResponse } from "next/server";
import { prisma } from "@/app/services/prisma";
import { requireAdmin } from "@/lib/admin";

// APPROVE contribution
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const { status } = await req.json();

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const updated = await prisma.contribution.update({
      where: { id: params.id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: "Forbidden or error" },
      { status: 403 }
    );
  }
}