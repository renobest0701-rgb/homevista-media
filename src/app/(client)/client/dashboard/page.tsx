import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { FolderOpen, Package, Clock } from "lucide-react";

export default async function ClientDashboardPage() {
  const session = await requireSession();

  const [projects, recentDeliveries] = await Promise.all([
    prisma.project.findMany({
      where: {
        client: { organizationId: session.organizationId },
        status: { in: ["ACTIVE", "COMPLETED"] },
      },
      include: {
        _count: {
          select: {
            assets: { where: { reviewStatus: "APPROVED", deletedAt: null } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.deliveryPackage.findMany({
      where: {
        client: { organizationId: session.organizationId },
        status: { in: ["SENT", "VIEWED"] },
      },
      orderBy: { deliveredAt: "desc" },
      take: 5,
      include: { project: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <h1 className="text-2xl font-bold text-white mb-8">プロジェクト一覧</h1>

      {/* Projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/client/projects/${p.id}`}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors group"
          >
            <div className="flex items-start justify-between mb-3">
              <FolderOpen className="h-5 w-5 text-zinc-500 group-hover:text-white transition-colors" />
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  p.status === "ACTIVE"
                    ? "bg-green-900 text-green-300"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {p.status === "ACTIVE" ? "進行中" : "完了"}
              </span>
            </div>
            <h2 className="text-white font-medium text-sm mb-1 leading-snug">
              {p.propertyName ?? p.name}
            </h2>
            <p className="text-zinc-500 text-xs">{p.code}</p>
            <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-500">承認済み素材</span>
              <span className="text-sm font-bold text-white">{p._count.assets}</span>
            </div>
          </Link>
        ))}

        {projects.length === 0 && (
          <div className="col-span-3 text-center py-16 text-zinc-500 text-sm">
            プロジェクトがありません
          </div>
        )}
      </div>

      {/* Recent deliveries */}
      {recentDeliveries.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Package className="h-4 w-4" />
            最近の納品
          </h2>
          <div className="space-y-2">
            {recentDeliveries.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="text-white text-sm">{d.title}</p>
                  <p className="text-zinc-500 text-xs">{d.project?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-400">{formatDate(d.deliveredAt)}</p>
                  {d.expiresAt && (
                    <p className="text-xs text-zinc-600 flex items-center gap-1 justify-end mt-0.5">
                      <Clock className="h-3 w-3" />
                      {formatDate(d.expiresAt)} まで
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
