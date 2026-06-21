"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CreateProjectModal } from "@/components/projects/create-project-modal";
import { useLang } from "@/lib/i18n/context";

export default function ProjectsPage() {
  const [showModal, setShowModal] = useState(false);
  const { tr } = useLang();

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
  });

  const projects = data?.data ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">{tr.projects}</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" />
          {tr.newProject}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FolderOpen className="h-10 w-10 text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">{tr.noProjects}</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200"
            >
              {tr.createFirst}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((p: Record<string, unknown>) => (
              <div
                key={String(p.id)}
                className="flex items-center justify-between px-5 py-4 bg-white border border-gray-200 rounded-xl hover:border-gray-400 transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-gray-900 font-medium">{String(p.name)}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {String(p.code)} · {String((p.client as Record<string, unknown>)?.name ?? tr.clientUnset)}
                  </p>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span>{String(p.prefectureCode ?? "—")}</span>
                  <span>{formatDate(p.createdAt as string)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    p.status === "ACTIVE" ? "bg-green-900/40 text-green-400" : "bg-gray-100 text-gray-400"
                  }`}>
                    {p.status === "ACTIVE" ? tr.active : String(p.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && <CreateProjectModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
