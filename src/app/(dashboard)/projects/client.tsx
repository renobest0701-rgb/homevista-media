"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Plus, ChevronRight, Search, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CreateProjectModal } from "@/components/projects/create-project-modal";
import { useLang } from "@/lib/i18n/context";

type Project = {
  id: string;
  name: string;
  propertyName?: string | null;
  code: string;
  status: string;
  prefectureCode?: string | null;
  createdAt: Date;
  client?: { name: string } | null;
};

export function ProjectsClient({ initialProjects }: { initialProjects: Project[] }) {
  const [showModal, setShowModal] = useState(false);
  const [q, setQ] = useState("");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const { tr } = useLang();
  const qc = useQueryClient();

  const filtered = projects.filter((p) => {
    if (!q.trim()) return true;
    const term = q.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.propertyName ?? "").toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term) ||
      (p.client?.name ?? "").toLowerCase().includes(term)
    );
  });

  const handleCreated = async () => {
    // Re-fetch projects after creation
    const res = await fetch("/api/projects?limit=100");
    const data = await res.json();
    if (data.data) setProjects(data.data);
    await qc.invalidateQueries({ queryKey: ["projects"] });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-gray-200 flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold text-gray-900 shrink-0">{tr.projects}</h1>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="プロジェクト名・コードで検索..."
            className="w-full bg-gray-100 border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {tr.newProject}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FolderOpen className="h-10 w-10 text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">
              {projects.length === 0 ? tr.noProjects : "条件に一致するプロジェクトがありません"}
            </p>
            {projects.length === 0 && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200"
              >
                {tr.createFirst}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center justify-between px-5 py-4 bg-white border border-gray-200 rounded-xl hover:border-gray-400 transition-colors"
              >
                <div>
                  <p className="text-gray-900 font-medium">{p.propertyName ?? p.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {p.code} · {p.client?.name ?? tr.clientUnset}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="text-xs">{p.prefectureCode ?? "—"}</span>
                  <span className="text-xs">{formatDate(p.createdAt as unknown as string)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    p.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400"
                  }`}>
                    {p.status === "ACTIVE" ? tr.active : p.status}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
