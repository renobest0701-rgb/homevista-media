import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { withAuth } from "@/lib/auth/api-handler";

export const GET = withAuth(async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 1) return NextResponse.json({ results: [] });

  const [projects, shoots, assets] = await Promise.all([
    prisma.project.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { propertyName: { contains: q, mode: "insensitive" } },
          { code: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, name: true, propertyName: true, code: true, status: true },
    }),
    prisma.shoot.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, name: true, status: true, project: { select: { name: true } } },
    }),
    prisma.asset.findMany({
      where: {
        deletedAt: null,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { assetCode: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, title: true, assetCode: true, reviewStatus: true, assetType: true },
    }),
  ]);

  return NextResponse.json({
    results: [
      ...projects.map((p) => ({ type: "project" as const, id: p.id, title: p.propertyName ?? p.name, sub: p.code, status: p.status, href: `/projects/${p.id}` })),
      ...shoots.map((s) => ({ type: "shoot" as const, id: s.id, title: s.name, sub: (s.project as Record<string, string>)?.name ?? "", status: s.status, href: `/shoots/${s.id}` })),
      ...assets.map((a) => ({ type: "asset" as const, id: a.id, title: a.title ?? a.assetCode ?? "", sub: a.assetCode ?? "", status: a.reviewStatus, href: `/assets?q=${encodeURIComponent(a.assetCode ?? a.title ?? "")}` })),
    ],
  });
});
