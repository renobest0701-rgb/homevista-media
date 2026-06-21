"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Camera, Plus, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CreateShootModal } from "@/components/shoots/create-shoot-modal";

export default function ShootsPage() {
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["shoots"],
    queryFn: () => fetch("/api/shoots").then((r) => r.json()),
  });

  const shoots = data?.data ?? [];

  const statusLabel: Record<string, string> = {
    PLANNED: "予定",
    IN_PROGRESS: "撮影中",
    COMPLETED: "完了",
    CANCELLED: "キャンセル",
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-zinc-800 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">撮影案件</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-100"
        >
          <Plus className="h-4 w-4" />
          新規撮影案件
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-zinc-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : shoots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Camera className="h-10 w-10 text-zinc-700 mb-3" />
            <p className="text-zinc-500 text-sm">撮影案件がありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {shoots.map((s: Record<string, unknown>) => (
              <Link key={String(s.id)} href={`/shoots/${String(s.id)}`} className="flex items-center justify-between px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-600 transition-colors cursor-pointer">
                <div>
                  <p className="text-white font-medium">{String(s.name)}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {String((s.project as Record<string, unknown>)?.name ?? "—")}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <span>{formatDate(s.shootDate as string)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    s.status === "COMPLETED" ? "bg-green-900/40 text-green-400" :
                    s.status === "IN_PROGRESS" ? "bg-blue-900/40 text-blue-400" :
                    "bg-zinc-800 text-zinc-500"
                  }`}>
                    {statusLabel[String(s.status)] ?? String(s.status)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-600" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showModal && <CreateShootModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
