import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { withAuth } from "@/lib/auth/api-handler";
import { MemberRole } from "@prisma/client";

const createSchema = z.object({
  locationId: z.string().uuid().optional(),
  permissionType: z.enum(["FILMING", "AERIAL", "INTERIOR", "PUBLIC_SPACE", "PRIVATE_PROPERTY", "OTHER"]).optional(),
  authorityOrganization: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  permissionNumber: z.string().optional(),
  permissionGrantedDate: z.string().datetime().optional(),
  permittedShootDateFrom: z.string().datetime().optional(),
  permittedShootDateTo: z.string().datetime().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  permissionConditions: z.string().optional(),
  permittedMedia: z.array(z.string()).optional(),
  organicSocialAllowed: z.boolean().optional(),
  paidAdvertisingAllowed: z.boolean().optional(),
  overseasUseAllowed: z.boolean().optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(async ({ params }) => {
  const shootId = params?.id ?? "";

  const permits = await prisma.permissionRecord.findMany({
    where: { shootId },
    include: { location: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: permits });
}, { minimumRole: MemberRole.CLIENT_USER });

export const POST = withAuth(async ({ req, params }) => {
  const shootId = params?.id ?? "";
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const shoot = await prisma.shoot.findUnique({ where: { id: shootId } });
  if (!shoot) return NextResponse.json({ error: "Shoot not found" }, { status: 404 });

  const permit = await prisma.permissionRecord.create({
    data: { shootId, ...parsed.data },
    include: { location: true },
  });

  return NextResponse.json(permit, { status: 201 });
}, { minimumRole: MemberRole.PROJECT_MANAGER });
