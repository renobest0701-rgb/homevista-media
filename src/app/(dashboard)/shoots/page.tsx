import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { ShootsClient } from "./client";
import { redirect } from "next/navigation";

export default async function ShootsPage() {
  let session;
  try {
    session = await requireSession();
  } catch {
    redirect("/login");
  }

  const isUploader = session.role === "UPLOADER";
  const isClientRole = session.role === "CLIENT_ADMIN" || session.role === "CLIENT_USER";
  const where = isUploader
    ? { teamOrgId: session.organizationId }
    : isClientRole
    ? { project: { client: { organizationId: session.organizationId } } }
    : {};

  const shoots = await prisma.shoot.findMany({
    where,
    include: { project: { select: { id: true, name: true, propertyName: true } } },
    orderBy: { shootDate: "desc" },
    take: 100,
  });

  return <ShootsClient initialShoots={shoots} />;
}
