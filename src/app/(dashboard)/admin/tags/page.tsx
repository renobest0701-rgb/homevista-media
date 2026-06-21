"use client";
import { Tag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function TagsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["tags"],
    queryFn: () => fetch("/api/masters/tags").then((r) => r.json()),
  });
  const tags = data ?? [];

  const categoryLabel: Record<string, string> = {
    SHOOT_CATEGORY: "撮影カテゴリー",
    SHOOT_METHOD: "撮影方法",
    PROPERTY_TYPE: "物件種別",
  };

  const grouped = (tags as Record<string, unknown>[]).reduce<Record<string, Record<string, unknown>[]>>((acc, t) => {
    const cat = String(t.category);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">タグ管理</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <h2 className="text-sm font-medium text-gray-500 mb-3">{categoryLabel[cat] ?? cat}</h2>
                <div className="flex flex-wrap gap-2">
                  {items.map((t) => (
                    <span key={String(t.code)} className="px-3 py-1 bg-gray-100 border border-gray-300 rounded-full text-sm text-gray-600">
                      {String(t.labelJa)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
