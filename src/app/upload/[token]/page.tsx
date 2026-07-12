import { prisma } from "@/lib/db/client";
import { notFound } from "next/navigation";
import { UploadWizard } from "@/components/shoots/upload-wizard";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const shoot = await prisma.shoot.findFirst({
    where: { uploadToken: token, status: { in: ["PLANNED", "IN_PROGRESS"] } },
    include: {
      project: { select: { id: true, name: true, propertyName: true, prefectureCode: true } },
      teamOrg: { select: { name: true } },
      locations: {
        include: { location: { select: { id: true, name: true, locationType: true } } },
      },
    },
  });

  if (!shoot) notFound();

  return <UploadWizard shoot={shoot} uploadToken={token} />;
}
