import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { withAuth } from "@/lib/auth/api-handler";
import { MemberRole } from "@prisma/client";

const createSchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional(),
  officialName: z.string().optional(),
  locationType: z.enum(["PROPERTY", "STATION", "PARK", "BEACH", "STREET", "FACILITY", "NATURE", "OTHER"]).optional(),
  prefectureCode: z.string().optional(),
  municipalityCode: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);

  const locations = await prisma.location.findMany({
    where: q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
      ],
    } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ data: locations, total: locations.length });
}, { minimumRole: MemberRole.CLIENT_USER });

export const POST = withAuth(async ({ req }) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const location = await prisma.location.create({ data: parsed.data });
  return NextResponse.json(location, { status: 201 });
}, { minimumRole: MemberRole.PROJECT_MANAGER });
