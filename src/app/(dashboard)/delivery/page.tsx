"use client";
import { Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";

export default function DeliveryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["delivery-packages"],
    queryFn: () => fetch("/api/delivery").then((r) => r.json()),
  });
  const packages = data?.data ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">納品管理</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Package className="h-10 w-10 text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">納品パッケージがありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {packages.map((p: Record<string, unknown>) => (
              <div key={String(p.id)} className="flex items-center justify-between px-5 py-4 bg-white border border-gray-200 rounded-xl">
                <div>
                  <p className="text-gray-900 font-medium">{String(p.name)}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{String((p.client as Record<string, unknown>)?.name ?? "—")}</p>
                </div>
                <span className="text-gray-500 text-sm">{formatDate(p.createdAt as string)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
