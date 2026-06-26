"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, Plus, ChevronRight, Search, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CreateShootModal } from "@/components/shoots/create-shoot-modal";

type Shoot = {
  id: string;
  name: string;
  status: string;
  shootDate: Date;
  notes?: string | null;
  project: { id: string; name: string; propertyName?: string | null };
};

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "予定", IN_PROGRESS: "撮影中", COMPLETED: "完了", CANCELLED: "キャンセル",
};
const STATUS_COLOR: Record<string, string> = {
  PLANNED: "bg-yellow-50 text-yellow-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-green-50 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-400",
};
const STATUS_FILTERS = ["ALL", "PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export function ShootsClient({ initialShoots }: { initialShoots: Shoot[] }) {
  const [showModal, setShowModal] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [shoots, setShoots] = useState<Shoot[]>(initialShoots);

  const filtered = shoots.filter((s) => {
    const matchQ = !q.trim() ||
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      (s.project.propertyName ?? s.project.name).toLowerCase().includes(q.toLowerCase());
    const matchStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchQ && matchStatus;
  });

  const handleCreated = async () => {
    const res = await fetch("/api/shoots?limit=100");
    const data = await res.json();
    if (data.data) setShoots(data.data);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-gray-200 flex items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-900 shrink-0">撮影案件</h1>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="案件名・プロジェクト名で検索..."
            className="w-full bg-gray-100 border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                statusFilter === s
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {s === "ALL" ? "すべて" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          新規撮影案件
        </button>
      </div>

      <div className="px-8 py-2 border-b border-gray-100">
        <p className="text-xs text-gray-400">{filtered.length} 件</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Camera className="h-10 w-10 text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">
              {shoots.length === 0 ? "撮影案件がありません" : "条件に一致する撮影案件がありません"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => (
              <Link
                key={s.id}
                href={`/shoots/${s.id}`}
                className="flex items-center justify-between px-5 py-4 bg-white border border-gray-200 rounded-xl hover:border-gray-400 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Camera className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium text-sm">{s.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {s.project.propertyName ?? s.project.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">{formatDate(s.shootDate as unknown as string)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[s.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showModal && <CreateShootModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
    </div>
  );
}
