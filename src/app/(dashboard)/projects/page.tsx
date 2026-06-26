import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { ProjectsClient } from "./client";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  try {
    await requireSession();
  } catch {
    redirect("/login");
  }

  const projects = await prisma.project.findMany({
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return <ProjectsClient initialProjects={projects} />;
}
