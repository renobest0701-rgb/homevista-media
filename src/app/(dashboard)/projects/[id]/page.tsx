import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { ProjectDetailClient } from "./client";
import { redirect, notFound } from "next/navigation";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    await requireSession();
  } catch {
    redirect("/login");
  }

  const project = await prisma.project.findFirst({
    where: { id },
    include: {
      client: { select: { name: true } },
      shoots: { orderBy: { shootDate: "desc" } },
      _count: { select: { assets: true } },
    },
  });

  if (!project) notFound();

  return <ProjectDetailClient project={project} />;
}
