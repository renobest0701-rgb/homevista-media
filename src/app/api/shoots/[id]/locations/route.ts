import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { withAuth } from "@/lib/auth/api-handler";
import { MemberRole } from "@prisma/client";

const addSchema = z.object({
  locationId: z.string().uuid(),
  plannedCategory: z.string().optional(),
  notes: z.string().optional(),
  displayOrder: z.number().int().optional(),
});

export const GET = withAuth(async ({ params }) => {
  const shootId = params?.id ?? "";

  const shootLocations = await prisma.shootLocation.findMany({
    where: { shootId },
    include: { location: true },
    orderBy: { displayOrder: "asc" },
  });

  return NextResponse.json({ data: shootLocations });
}, { minimumRole: MemberRole.CLIENT_USER });

export const POST = withAuth(async ({ req, params }) => {
  const shootId = params?.id ?? "";
  const body = await req.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const shoot = await prisma.shoot.findUnique({ where: { id: shootId } });
  if (!shoot) return NextResponse.json({ error: "Shoot not found" }, { status: 404 });

  const shootLocation = await prisma.shootLocation.create({
    data: { shootId, ...parsed.data },
    include: { location: true },
  });

  return NextResponse.json(shootLocation, { status: 201 });
}, { minimumRole: MemberRole.PROJECT_MANAGER });
