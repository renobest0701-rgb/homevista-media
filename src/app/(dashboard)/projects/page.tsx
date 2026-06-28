import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { ProjectsClient } from "./client";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  let session;
  try {
    session = await requireSession();
  } catch {
    redirect("/login");
  }

  const isClientRole = session.role === "CLIENT_ADMIN" || session.role === "CLIENT_USER";
  const where = isClientRole
    ? { client: { organizationId: session.organizationId } }
    : {};

  const projects = await prisma.project.findMany({
    where,
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return <ProjectsClient initialProjects={projects} />;
}
