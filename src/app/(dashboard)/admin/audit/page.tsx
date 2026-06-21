"use client";
import { BarChart2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";

export default function AuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit"],
    queryFn: () => fetch("/api/admin/audit").then((r) => r.json()),
  });
  const logs = data?.data ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-zinc-800">
        <h1 className="text-lg font-semibold text-white">操作履歴</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-zinc-800 rounded-lg animate-pulse" />)}</div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <BarChart2 className="h-10 w-10 text-zinc-700 mb-3" />
            <p className="text-zinc-500 text-sm">操作履歴がありません</p>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log: Record<string, unknown>) => (
              <div key={String(log.id)} className="flex items-center gap-4 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-sm">
                <span className="text-zinc-500 w-36 shrink-0">{formatDate(log.createdAt as string)}</span>
                <span className="text-zinc-400 w-24 shrink-0">{String(log.action)}</span>
                <span className="text-zinc-300">{String(log.entityType)} · {String(log.entityId).slice(0, 8)}…</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
