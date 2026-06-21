"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Grid, List, Search, SlidersHorizontal, Plus } from "lucide-react";
import { AssetCard } from "./asset-card";
import { cn, formatDate } from "@/lib/utils";

type ViewMode = "grid" | "list";

export function AssetLibrary() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    assetType: "",
    productionStatus: "",
    reviewStatus: "",
    prefectureCode: "",
    season: "",
  });

  const params = new URLSearchParams({
    page: String(page),
    limit: "24",
    ...(q ? { q } : {}),
    ...Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== "")
    ),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["assets", params.toString()],
    queryFn: () =>
      fetch(`/api/assets?${params}`).then((r) => r.json()),
  });

  const assets = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 border-b border-zinc-800 flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold text-white shrink-0">素材ライブラリ</h1>

        <div className="flex items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="素材コード、タイトルで検索..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          {/* Filters */}
          <select
            value={filters.assetType}
            onChange={(e) => setFilters((f) => ({ ...f, assetType: e.target.value }))}
            className="bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="">素材種類</option>
            <option value="VIDEO">動画</option>
            <option value="IMAGE">静止画</option>
            <option value="DRONE_VIDEO">ドローン動画</option>
            <option value="DRONE_IMAGE">ドローン静止画</option>
          </select>

          <select
            value={filters.reviewStatus}
            onChange={(e) => setFilters((f) => ({ ...f, reviewStatus: e.target.value }))}
            className="bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="">承認状態</option>
            <option value="PENDING">確認待ち</option>
            <option value="APPROVED">承認済み</option>
            <option value="REJECTED">却下</option>
          </select>

          <select
            value={filters.season}
            onChange={(e) => setFilters((f) => ({ ...f, season: e.target.value }))}
            className="bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="">季節</option>
            <option value="SPRING">春</option>
            <option value="SUMMER">夏</option>
            <option value="AUTUMN">秋</option>
            <option value="WINTER">冬</option>
            <option value="CHERRY_BLOSSOM">桜</option>
          </select>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === "grid" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"
            )}
          >
            <Grid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              viewMode === "list" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"
            )}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Count */}
      <div className="px-8 py-3 border-b border-zinc-800/50">
        <p className="text-xs text-zinc-500">
          {isLoading ? "検索中..." : `${total.toLocaleString()} 件`}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-video bg-zinc-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Search className="h-8 w-8 text-zinc-700 mb-3" />
            <p className="text-zinc-500 text-sm">素材が見つかりませんでした</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {assets.map((asset: Record<string, unknown>) => (
              <AssetCard key={String(asset.id)} asset={asset as Parameters<typeof AssetCard>[0]["asset"]} />
            ))}
          </div>
        ) : (
          <div className="space-y-px">
            {/* List view header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 text-xs text-zinc-500 border-b border-zinc-800">
              <span>素材</span>
              <span>種類</span>
              <span>制作状態</span>
              <span>承認状態</span>
              <span>撮影日</span>
              <span>プロジェクト</span>
            </div>
            {assets.map((asset: Record<string, unknown>) => (
              <div
                key={String(asset.id)}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-zinc-800/50 rounded-lg transition-colors border border-transparent hover:border-zinc-700"
              >
                <div>
                  <p className="text-white font-medium truncate">
                    {String(asset.title ?? asset.assetCode)}
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {String(asset.assetCode)}
                  </p>
                </div>
                <span className="text-zinc-400">{String(asset.assetType)}</span>
                <span className="text-zinc-400">{String(asset.productionStatus)}</span>
                <ReviewBadge status={String(asset.reviewStatus)} />
                <span className="text-zinc-400">
                  {formatDate(
                    (asset.shoot as Record<string, unknown> | null)
                      ?.shootDate as string | null
                  )}
                </span>
                <span className="text-zinc-400 truncate">
                  {String(
                    (
                      (asset.project as Record<string, unknown> | null)
                        ?.name ?? "—"
                    )
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 24 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm bg-zinc-800 text-zinc-300 rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition-colors"
            >
              前へ
            </button>
            <span className="px-4 py-2 text-sm text-zinc-400">
              {page} / {Math.ceil(total / 24)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / 24)}
              className="px-4 py-2 text-sm bg-zinc-800 text-zinc-300 rounded-lg disabled:opacity-40 hover:bg-zinc-700 transition-colors"
            >
              次へ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "text-yellow-400",
    APPROVED: "text-green-400",
    REJECTED: "text-red-400",
    IN_REVIEW: "text-blue-400",
    NEEDS_INFO: "text-orange-400",
  };
  const labels: Record<string, string> = {
    PENDING: "確認待ち",
    APPROVED: "承認済み",
    REJECTED: "却下",
    IN_REVIEW: "確認中",
    NEEDS_INFO: "情報要",
  };
  return (
    <span className={cn("text-xs", map[status] ?? "text-zinc-400")}>
      {labels[status] ?? status}
    </span>
  );
}
