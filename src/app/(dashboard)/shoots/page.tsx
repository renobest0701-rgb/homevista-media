import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { ShootsClient } from "./client";
import { redirect } from "next/navigation";

export default async function ShootsPage() {
  try {
    await requireSession();
  } catch {
    redirect("/login");
  }

  const shoots = await prisma.shoot.findMany({
    include: { project: { select: { id: true, name: true, propertyName: true } } },
    orderBy: { shootDate: "desc" },
    take: 100,
  });

  return <ShootsClient initialShoots={shoots} />;
}
