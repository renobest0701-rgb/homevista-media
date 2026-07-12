import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function DeliveryPage() {
  let session;
  try {
    session = await requireSession();
  } catch {
    redirect("/login");
  }

  const isClientRole = session!.role === "CLIENT_ADMIN" || session!.role === "CLIENT_USER";
  const where = isClientRole ? { clientId: session!.organizationId } : {};

  const packages = await prisma.deliveryPackage.findMany({
    where,
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">納品管理</h1>
        <p className="text-xs text-gray-400 mt-0.5">{packages.length}件</p>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        {packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Package className="h-10 w-10 text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">納品パッケージがありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {packages.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-4 bg-white border border-gray-200 rounded-xl">
                <div>
                  <p className="text-gray-900 font-medium">{p.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{p.client?.name ?? "—"} · {p.status}</p>
                </div>
                <span className="text-gray-500 text-sm">{formatDate(p.createdAt.toISOString())}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
