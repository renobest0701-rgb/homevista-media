"use client";
import { Globe } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function PublicationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: () => fetch("/api/sites").then((r) => r.json()),
  });
  const sites = data ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">掲載先管理</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Globe className="h-10 w-10 text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">サイトが登録されていません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sites.map((s: Record<string, unknown>) => (
              <div key={String(s.id)} className="flex items-center justify-between px-5 py-4 bg-white border border-gray-200 rounded-xl">
                <div>
                  <p className="text-gray-900 font-medium">{String(s.name)}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{String(s.code)} · {String(s.type)}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${s.status === "ACTIVE" ? "bg-green-900/40 text-green-400" : "bg-gray-100 text-gray-400"}`}>
                  {s.status === "ACTIVE" ? "稼働中" : String(s.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
