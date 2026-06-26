"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Plus, Search, ChevronRight, Package, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CreateShootModal } from "@/components/shoots/create-shoot-modal";

type Shoot = {
  id: string;
  name: string;
  status: string;
  shootDate: Date;
  notes?: string | null;
};

type Project = {
  id: string;
  name: string;
  propertyName?: string | null;
  code: string;
  status: string;
  prefectureCode?: string | null;
  shoots: Shoot[];
  _count: { assets: number };
  client?: { name: string } | null;
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

export function ProjectDetailClient({ project: initialProject }: { project: Project }) {
  const router = useRouter();
  const [project, setProject] = useState<Project>(initialProject);
  const [showModal, setShowModal] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredShoots = project.shoots.filter((s) => {
    const matchQ = !searchQ.trim() ||
      s.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      (s.notes ?? "").toLowerCase().includes(searchQ.toLowerCase());
    const matchStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchQ && matchStatus;
  });

  const handleCreated = async () => {
    const res = await fetch(`/api/projects/${project.id}`);
    const data = await res.json();
    if (data.id) setProject(data);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => router.push("/projects")} className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-gray-400">プロジェクト一覧</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{project.propertyName ?? project.name}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {project.code}
              {project.client?.name && ` · ${project.client.name}`}
              {project.prefectureCode && ` · ${project.prefectureCode}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-gray-300" />
                <span>{project.shoots.length}件</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Package className="h-4 w-4 text-gray-300" />
                <span>{project._count.assets}素材</span>
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              project.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
              {project.status}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-8 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="撮影案件を検索..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-gray-100 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
          />
          {searchQ && (
            <button onClick={() => setSearchQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
                statusFilter === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {s === "ALL" ? "すべて" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          新規撮影案件
        </button>
      </div>

      {searchQ || statusFilter !== "ALL" ? (
        <div className="px-8 py-1.5 border-b border-gray-50">
          <p className="text-xs text-gray-400">{filteredShoots.length} / {project.shoots.length} 件表示</p>
        </div>
      ) : null}

      {/* Shoots list */}
      <div className="flex-1 overflow-y-auto p-8">
        {filteredShoots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Camera className="h-9 w-9 text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">
              {project.shoots.length === 0
                ? "撮影案件がありません。「新規撮影案件」から追加してください。"
                : "条件に一致する撮影案件がありません"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredShoots.map((s) => (
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
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    {s.notes && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{s.notes}</p>}
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

      {showModal && (
        <CreateShootModal
          defaultProjectId={project.id}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
