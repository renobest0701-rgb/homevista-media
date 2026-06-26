"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Grid, List, Search, SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import { AssetCard } from "./asset-card";
import { cn, formatDate } from "@/lib/utils";

type ViewMode = "grid" | "list";
type TagOption = { id: string; code: string; labelJa: string };
type ProjectOption = { id: string; name: string; propertyName?: string | null; code: string };

type Filters = {
  assetType: string;
  reviewStatus: string;
  season: string;
  timeOfDay: string;
  projectId: string;
  dateFrom: string;
  dateTo: string;
  tagIds: string[];
};

const EMPTY_FILTERS: Filters = {
  assetType: "",
  reviewStatus: "",
  season: "",
  timeOfDay: "",
  projectId: "",
  dateFrom: "",
  dateTo: "",
  tagIds: [],
};

const REVIEW_STATUS_LABEL: Record<string, string> = {
  PENDING: "確認待ち", APPROVED: "承認済み", REJECTED: "却下", IN_REVIEW: "確認中",
};
const REVIEW_STATUS_COLOR: Record<string, string> = {
  PENDING: "text-yellow-600 bg-yellow-50",
  APPROVED: "text-green-600 bg-green-50",
  REJECTED: "text-red-600 bg-red-50",
  IN_REVIEW: "text-blue-600 bg-blue-50",
};

export function AssetLibrary() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);

  useEffect(() => {
    fetch("/api/masters/tags?limit=100").then((r) => r.json()).then((d) => setTagOptions(d.data ?? d ?? []));
    fetch("/api/projects?limit=100").then((r) => r.json()).then((d) => setProjectOptions(d.data ?? []));
  }, []);

  const params = new URLSearchParams({ page: String(page), limit: "24" });
  if (q) params.set("q", q);
  if (filters.assetType) params.set("assetType", filters.assetType);
  if (filters.reviewStatus) params.set("reviewStatus", filters.reviewStatus);
  if (filters.season) params.set("season", filters.season);
  if (filters.timeOfDay) params.set("timeOfDay", filters.timeOfDay);
  if (filters.projectId) params.set("projectId", filters.projectId);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.tagIds.length > 0) params.set("tagIds", filters.tagIds.join(","));

  const { data, isLoading } = useQuery({
    queryKey: ["assets", params.toString()],
    queryFn: () => fetch(`/api/assets?${params}`).then((r) => r.json()),
  });

  const assets = data?.data ?? [];
  const total = data?.total ?? 0;

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const toggleTag = (id: string) => {
    setFilters((f) => ({
      ...f,
      tagIds: f.tagIds.includes(id) ? f.tagIds.filter((t) => t !== id) : [...f.tagIds, id],
    }));
    setPage(1);
  };

  const clearFilters = () => { setFilters(EMPTY_FILTERS); setPage(1); };

  const activeFilterCount =
    (filters.assetType ? 1 : 0) +
    (filters.reviewStatus ? 1 : 0) +
    (filters.season ? 1 : 0) +
    (filters.timeOfDay ? 1 : 0) +
    (filters.projectId ? 1 : 0) +
    (filters.dateFrom || filters.dateTo ? 1 : 0) +
    filters.tagIds.length;

  // Active filter chips for display
  const activeChips: { label: string; clear: () => void }[] = [];
  if (filters.assetType) activeChips.push({ label: filters.assetType, clear: () => setFilter("assetType", "") });
  if (filters.reviewStatus) activeChips.push({ label: REVIEW_STATUS_LABEL[filters.reviewStatus] ?? filters.reviewStatus, clear: () => setFilter("reviewStatus", "") });
  if (filters.season) activeChips.push({ label: filters.season, clear: () => setFilter("season", "") });
  if (filters.timeOfDay) activeChips.push({ label: filters.timeOfDay, clear: () => setFilter("timeOfDay", "") });
  if (filters.projectId) {
    const pj = projectOptions.find((p) => p.id === filters.projectId);
    activeChips.push({ label: pj?.propertyName ?? pj?.name ?? "プロジェクト", clear: () => setFilter("projectId", "") });
  }
  if (filters.dateFrom || filters.dateTo) {
    activeChips.push({
      label: `${filters.dateFrom || "〜"} ～ ${filters.dateTo || "〜"}`,
      clear: () => { setFilter("dateFrom", ""); setFilter("dateTo", ""); },
    });
  }
  filters.tagIds.forEach((id) => {
    const tag = tagOptions.find((t) => t.id === id);
    if (tag) activeChips.push({ label: `#${tag.labelJa}`, clear: () => toggleTag(id) });
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-4 border-b border-gray-200 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold text-gray-900 shrink-0">素材ライブラリ</h1>
          <div className="flex items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="素材コード・タイトルで検索..."
                className="w-full bg-gray-100 border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
              />
              {q && (
                <button onClick={() => { setQ(""); setPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors",
                filtersOpen || activeFilterCount > 0
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              フィルター
              {activeFilterCount > 0 && (
                <span className="bg-white text-gray-900 text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
              {filtersOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={cn("p-1.5 rounded-md transition-colors", viewMode === "grid" ? "bg-gray-200 text-gray-900" : "text-gray-400 hover:text-gray-900")}
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-1.5 rounded-md transition-colors", viewMode === "list" ? "bg-gray-200 text-gray-900" : "text-gray-400 hover:text-gray-900")}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Expandable filter panel */}
        {filtersOpen && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Asset type */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">素材種類</label>
                <select
                  value={filters.assetType}
                  onChange={(e) => setFilter("assetType", e.target.value)}
                  className="w-full bg-white border border-gray-200 text-sm text-gray-700 rounded-lg px-2.5 py-2 focus:outline-none focus:border-gray-400"
                >
                  <option value="">すべて</option>
                  <option value="VIDEO">動画</option>
                  <option value="IMAGE">静止画</option>
                  <option value="DRONE_VIDEO">ドローン動画</option>
                  <option value="DRONE_IMAGE">ドローン静止画</option>
                  <option value="RAW">RAW</option>
                </select>
              </div>

              {/* Review status */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">承認状態</label>
                <select
                  value={filters.reviewStatus}
                  onChange={(e) => setFilter("reviewStatus", e.target.value)}
                  className="w-full bg-white border border-gray-200 text-sm text-gray-700 rounded-lg px-2.5 py-2 focus:outline-none focus:border-gray-400"
                >
                  <option value="">すべて</option>
                  <option value="PENDING">確認待ち</option>
                  <option value="APPROVED">承認済み</option>
                  <option value="IN_REVIEW">確認中</option>
                  <option value="REJECTED">却下</option>
                </select>
              </div>

              {/* Season */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">季節</label>
                <select
                  value={filters.season}
                  onChange={(e) => setFilter("season", e.target.value)}
                  className="w-full bg-white border border-gray-200 text-sm text-gray-700 rounded-lg px-2.5 py-2 focus:outline-none focus:border-gray-400"
                >
                  <option value="">すべて</option>
                  <option value="SPRING">春</option>
                  <option value="SUMMER">夏</option>
                  <option value="AUTUMN">秋</option>
                  <option value="WINTER">冬</option>
                  <option value="CHERRY_BLOSSOM">桜</option>
                </select>
              </div>

              {/* Time of day */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">時間帯</label>
                <select
                  value={filters.timeOfDay}
                  onChange={(e) => setFilter("timeOfDay", e.target.value)}
                  className="w-full bg-white border border-gray-200 text-sm text-gray-700 rounded-lg px-2.5 py-2 focus:outline-none focus:border-gray-400"
                >
                  <option value="">すべて</option>
                  <option value="DAWN">夜明け</option>
                  <option value="MORNING">朝</option>
                  <option value="DAYTIME">昼</option>
                  <option value="AFTERNOON">午後</option>
                  <option value="SUNSET">夕暮れ</option>
                  <option value="NIGHT">夜間</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Project */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">プロジェクト</label>
                <select
                  value={filters.projectId}
                  onChange={(e) => setFilter("projectId", e.target.value)}
                  className="w-full bg-white border border-gray-200 text-sm text-gray-700 rounded-lg px-2.5 py-2 focus:outline-none focus:border-gray-400"
                >
                  <option value="">すべて</option>
                  {projectOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.propertyName ?? p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date from */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">撮影日（から）</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilter("dateFrom", e.target.value)}
                  className="w-full bg-white border border-gray-200 text-sm text-gray-700 rounded-lg px-2.5 py-2 focus:outline-none focus:border-gray-400"
                />
              </div>

              {/* Date to */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">撮影日（まで）</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilter("dateTo", e.target.value)}
                  className="w-full bg-white border border-gray-200 text-sm text-gray-700 rounded-lg px-2.5 py-2 focus:outline-none focus:border-gray-400"
                />
              </div>
            </div>

            {/* Tags */}
            {tagOptions.length > 0 && (
              <div>
                <label className="block text-xs text-gray-500 mb-2">タグ（複数選択可）</label>
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "px-3 py-1 text-xs rounded-full border transition-colors",
                        filters.tagIds.includes(tag.id)
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      )}
                    >
                      {tag.labelJa}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeFilterCount > 0 && (
              <div className="flex justify-end">
                <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-700 underline">
                  すべてクリア
                </button>
              </div>
            )}
          </div>
        )}

        {/* Active filter chips */}
        {activeChips.length > 0 && !filtersOpen && (
          <div className="flex flex-wrap gap-2">
            {activeChips.map((chip, i) => (
              <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
                {chip.label}
                <button onClick={chip.clear} className="text-gray-400 hover:text-gray-700 ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 underline px-1">
              クリア
            </button>
          </div>
        )}
      </div>

      {/* Count */}
      <div className="px-8 py-2.5 border-b border-gray-100">
        <p className="text-xs text-gray-400">
          {isLoading ? "検索中..." : `${total.toLocaleString()} 件`}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-video bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Search className="h-8 w-8 text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">素材が見つかりませんでした</p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="mt-3 text-sm text-gray-500 underline hover:text-gray-700">
                フィルターをリセット
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {assets.map((asset: Record<string, unknown>) => (
              <AssetCard key={String(asset.id)} asset={asset as Parameters<typeof AssetCard>[0]["asset"]} />
            ))}
          </div>
        ) : (
          <div className="space-y-px">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 text-xs text-gray-400 border-b border-gray-200">
              <span>素材</span><span>種類</span><span>タグ</span><span>承認状態</span><span>撮影日</span><span>プロジェクト</span>
            </div>
            {assets.map((asset: Record<string, unknown>) => {
              const tags = (asset.tags as { tag: { labelJa: string } }[]) ?? [];
              return (
                <div
                  key={String(asset.id)}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 text-sm hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                >
                  <div>
                    <p className="text-gray-900 font-medium truncate">{String(asset.title ?? asset.assetCode)}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{String(asset.assetCode)}</p>
                  </div>
                  <span className="text-gray-500 text-xs self-center">{String(asset.assetType)}</span>
                  <div className="flex flex-wrap gap-1 self-center">
                    {tags.slice(0, 2).map((t, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {t.tag.labelJa}
                      </span>
                    ))}
                    {tags.length > 2 && (
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 text-xs rounded-full">+{tags.length - 2}</span>
                    )}
                  </div>
                  <div className="self-center">
                    <ReviewBadge status={String(asset.reviewStatus)} />
                  </div>
                  <span className="text-gray-500 text-xs self-center">
                    {formatDate((asset.shoot as Record<string, unknown> | null)?.shootDate as string | null)}
                  </span>
                  <span className="text-gray-500 text-xs truncate self-center">
                    {String((asset.project as Record<string, unknown> | null)?.name ?? "—")}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {total > 24 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-200 transition-colors"
            >
              前へ
            </button>
            <span className="px-4 py-2 text-sm text-gray-500">
              {page} / {Math.ceil(total / 24)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / 24)}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-200 transition-colors"
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
  const label = REVIEW_STATUS_LABEL[status] ?? status;
  const color = REVIEW_STATUS_COLOR[status] ?? "text-gray-500 bg-gray-50";
  return <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", color)}>{label}</span>;
}
