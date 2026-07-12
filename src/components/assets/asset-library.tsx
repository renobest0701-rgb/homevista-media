"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Grid,
  List,
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  Tag,
  MapPin,
  Eye,
  Package,
  Trash2,
  CheckSquare,
} from "lucide-react";
import { AssetCard, REVIEW_STATUS_LABEL, REVIEW_STATUS_COLOR, PRODUCTION_STATUS_LABEL, VISIBILITY_LABEL, ASSET_TYPE_LABEL, isVideoType } from "./asset-card";
import type { Asset } from "./asset-card";
import { AssetPreviewModal } from "./asset-preview-modal";
import { cn, formatDate, formatDuration } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type TypeTab = "ALL" | "IMAGE" | "VIDEO";
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

const TAB_LABELS: Record<TypeTab, string> = {
  ALL: "すべて",
  IMAGE: "静止画",
  VIDEO: "動画",
};

// ─── Main component ───────────────────────────────────────────────────────────

export function AssetLibrary() {
  const [typeTab, setTypeTab] = useState<TypeTab>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Preview modal
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);

  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);

  useEffect(() => {
    fetch("/api/masters/tags?limit=100")
      .then((r) => r.json())
      .then((d) => setTagOptions(d.data ?? d ?? []));
    fetch("/api/projects?limit=100")
      .then((r) => r.json())
      .then((d) => setProjectOptions(d.data ?? []));
  }, []);

  // Build query params helper
  const buildParams = useCallback(
    (overrides: { tab?: TypeTab; page?: number; limit?: number } = {}) => {
      const tab = overrides.tab ?? typeTab;
      const p = new URLSearchParams({
        page: String(overrides.page ?? page),
        limit: String(overrides.limit ?? 24),
      });
      if (q) p.set("q", q);
      if (tab === "IMAGE") p.set("assetTypeGroup", "IMAGE");
      else if (tab === "VIDEO") p.set("assetTypeGroup", "VIDEO");
      if (tab === "ALL" && filters.assetType) p.set("assetType", filters.assetType);
      if (filters.reviewStatus) p.set("reviewStatus", filters.reviewStatus);
      if (filters.season) p.set("season", filters.season);
      if (filters.timeOfDay) p.set("timeOfDay", filters.timeOfDay);
      if (filters.projectId) p.set("projectId", filters.projectId);
      if (filters.dateFrom) p.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) p.set("dateTo", filters.dateTo);
      if (filters.tagIds.length > 0) p.set("tagIds", filters.tagIds.join(","));
      return p;
    },
    [typeTab, page, q, filters]
  );

  // Main data query
  const mainParams = buildParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["assets", mainParams.toString()],
    queryFn: () => fetch(`/api/assets?${mainParams}`).then((r) => r.json()),
  });

  // Tab count queries (limit=1, just need total)
  const imageCountParams = buildParams({ tab: "IMAGE", page: 1, limit: 1 });
  const videoCountParams = buildParams({ tab: "VIDEO", page: 1, limit: 1 });
  const allCountParams = buildParams({ tab: "ALL", page: 1, limit: 1 });

  const { data: allCount } = useQuery({
    queryKey: ["assets-count", "ALL", q, filters],
    queryFn: () => fetch(`/api/assets?${allCountParams}`).then((r) => r.json()),
    staleTime: 30_000,
  });
  const { data: imageCount } = useQuery({
    queryKey: ["assets-count", "IMAGE", q, filters],
    queryFn: () => fetch(`/api/assets?${imageCountParams}`).then((r) => r.json()),
    staleTime: 30_000,
  });
  const { data: videoCount } = useQuery({
    queryKey: ["assets-count", "VIDEO", q, filters],
    queryFn: () => fetch(`/api/assets?${videoCountParams}`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const assets: Asset[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / 24);

  // ── Filters ──────────────────────────────────────────────────────────────

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

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const changeTab = (tab: TypeTab) => {
    setTypeTab(tab);
    setFilter("assetType", ""); // reset subtype filter on tab switch
    setPage(1);
    setSelectedIds(new Set());
  };

  const activeFilterCount =
    (filters.assetType ? 1 : 0) +
    (filters.reviewStatus ? 1 : 0) +
    (filters.season ? 1 : 0) +
    (filters.timeOfDay ? 1 : 0) +
    (filters.projectId ? 1 : 0) +
    (filters.dateFrom || filters.dateTo ? 1 : 0) +
    filters.tagIds.length;

  const activeChips: { label: string; clear: () => void }[] = [];
  if (filters.assetType)
    activeChips.push({ label: ASSET_TYPE_LABEL[filters.assetType] ?? filters.assetType, clear: () => setFilter("assetType", "") });
  if (filters.reviewStatus)
    activeChips.push({ label: REVIEW_STATUS_LABEL[filters.reviewStatus] ?? filters.reviewStatus, clear: () => setFilter("reviewStatus", "") });
  if (filters.season) activeChips.push({ label: filters.season, clear: () => setFilter("season", "") });
  if (filters.timeOfDay) activeChips.push({ label: filters.timeOfDay, clear: () => setFilter("timeOfDay", "") });
  if (filters.projectId) {
    const pj = projectOptions.find((p) => p.id === filters.projectId);
    activeChips.push({
      label: pj?.propertyName ?? pj?.name ?? "プロジェクト",
      clear: () => setFilter("projectId", ""),
    });
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

  // ── Selection ─────────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(assets.map((a) => a.id)));
  const clearSelection = () => setSelectedIds(new Set());

  // ── Preview navigation ────────────────────────────────────────────────────

  const openPreview = (asset: Asset) => {
    const idx = assets.findIndex((a) => a.id === asset.id);
    setPreviewAsset(asset);
    setPreviewIndex(idx);
  };

  const prevPreview = () => {
    if (previewIndex > 0) {
      setPreviewAsset(assets[previewIndex - 1]);
      setPreviewIndex(previewIndex - 1);
    }
  };
  const nextPreview = () => {
    if (previewIndex < assets.length - 1) {
      setPreviewAsset(assets[previewIndex + 1]);
      setPreviewIndex(previewIndex + 1);
    }
  };

  // ── Bulk actions (stubs) ──────────────────────────────────────────────────

  const bulkActions = [
    {
      icon: Tag,
      label: "タグ付与",
      action: () => {
        // TODO: open tag picker modal, then POST /api/assets bulk update
        console.log("bulk tag", [...selectedIds]);
      },
    },
    {
      icon: MapPin,
      label: "場所変更",
      action: () => {
        // TODO: open location picker modal
        console.log("bulk location", [...selectedIds]);
      },
    },
    {
      icon: Eye,
      label: "公開範囲",
      action: () => {
        // TODO: open visibility picker, then POST /api/assets { assetIds, updates: { visibility } }
        console.log("bulk visibility", [...selectedIds]);
      },
    },
    {
      icon: Package,
      label: "納品追加",
      action: () => {
        // TODO: open delivery package selector
        console.log("bulk delivery", [...selectedIds]);
      },
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
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
                placeholder="素材コード・タイトル・タグで検索..."
                className="w-full bg-gray-100 border border-gray-200 rounded-lg pl-9 pr-8 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
              />
              {q && (
                <button
                  onClick={() => { setQ(""); setPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
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
              title="グリッド表示"
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-1.5 rounded-md transition-colors", viewMode === "list" ? "bg-gray-200 text-gray-900" : "text-gray-400 hover:text-gray-900")}
              title="リスト表示"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Type tabs */}
        <div className="flex items-center gap-1">
          {(["ALL", "IMAGE", "VIDEO"] as TypeTab[]).map((tab) => {
            const count =
              tab === "ALL" ? allCount?.total : tab === "IMAGE" ? imageCount?.total : videoCount?.total;
            return (
              <button
                key={tab}
                onClick={() => changeTab(tab)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors",
                  typeTab === tab
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                )}
              >
                {TAB_LABELS[tab]}
                {count != null && (
                  <span
                    className={cn(
                      "text-xs rounded-full px-1.5 min-w-[1.25rem] text-center leading-5",
                      typeTab === tab ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {count.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Asset type — only show when on ALL tab */}
              {typeTab === "ALL" && (
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
                    <option value="CG">CG</option>
                  </select>
                </div>
              )}

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
                  <option value="NEEDS_INFO">要確認</option>
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
              <div>
                <label className="block text-xs text-gray-500 mb-1">撮影日（から）</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilter("dateFrom", e.target.value)}
                  className="w-full bg-white border border-gray-200 text-sm text-gray-700 rounded-lg px-2.5 py-2 focus:outline-none focus:border-gray-400"
                />
              </div>
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
              <span
                key={i}
                className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700"
              >
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

      {/* ── Count bar ── */}
      <div className="px-8 py-2 border-b border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {isLoading ? "検索中..." : `${total.toLocaleString()} 件`}
        </p>
        {assets.length > 0 && (
          <div className="flex items-center gap-3">
            {selectedIds.size > 0 ? (
              <button onClick={clearSelection} className="text-xs text-gray-400 hover:text-gray-700 underline">
                選択解除
              </button>
            ) : (
              <button onClick={selectAll} className="text-xs text-gray-400 hover:text-gray-700 underline">
                このページを全選択
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-8 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-video bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-gray-500 text-sm mb-3">読み込みに失敗しました</p>
            <p className="text-gray-400 text-xs">ページを再読み込みしてください</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Search className="h-8 w-8 text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">該当する素材がありません</p>
            {(q || activeFilterCount > 0) && (
              <div className="mt-4 flex flex-col items-center gap-2">
                {q && (
                  <button
                    onClick={() => setQ("")}
                    className="text-sm text-gray-500 underline hover:text-gray-700"
                  >
                    検索をクリア
                  </button>
                )}
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-500 underline hover:text-gray-700"
                  >
                    フィルターをリセット
                  </button>
                )}
              </div>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                checked={selectedIds.has(asset.id)}
                onToggle={() => toggleSelect(asset.id)}
                onPreview={() => openPreview(asset)}
              />
            ))}
          </div>
        ) : (
          <AssetListView
            assets={assets}
            selectedIds={selectedIds}
            onToggle={toggleSelect}
            onPreview={openPreview}
            onSelectAll={selectAll}
            allSelected={selectedIds.size === assets.length && assets.length > 0}
          />
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
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-200 transition-colors"
            >
              次へ
            </button>
          </div>
        )}
      </div>

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-between gap-4 bg-gray-900 text-white px-8 py-3 shadow-xl">
          <div className="flex items-center gap-3">
            <CheckSquare className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium">{selectedIds.size} 件選択中</span>
            <button onClick={clearSelection} className="text-xs text-gray-400 hover:text-gray-200 underline">
              解除
            </button>
          </div>
          <div className="flex items-center gap-2">
            {bulkActions.map(({ icon: Icon, label, action }) => (
              <button
                key={label}
                onClick={action}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
            <button
              onClick={() => {
                // TODO: confirm and bulk delete
                console.log("bulk delete", [...selectedIds]);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              削除
            </button>
          </div>
        </div>
      )}

      {/* ── Preview modal ── */}
      {previewAsset && (
        <AssetPreviewModal
          asset={previewAsset}
          onClose={() => setPreviewAsset(null)}
          onPrev={previewIndex > 0 ? prevPreview : undefined}
          onNext={previewIndex < assets.length - 1 ? nextPreview : undefined}
          hasPrev={previewIndex > 0}
          hasNext={previewIndex < assets.length - 1}
        />
      )}
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function AssetListView({
  assets,
  selectedIds,
  onToggle,
  onPreview,
  onSelectAll,
  allSelected,
}: {
  assets: Asset[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onPreview: (asset: Asset) => void;
  onSelectAll: () => void;
  allSelected: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-[2rem_3rem_2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-400 font-medium">
        <button
          onClick={onSelectAll}
          className={cn("flex items-center justify-center", allSelected ? "text-blue-500" : "text-gray-300 hover:text-gray-500")}
          title="このページを全選択"
        >
          <CheckSquare className="h-3.5 w-3.5" />
        </button>
        <span />
        <span>タイトル / コード</span>
        <span>種別</span>
        <span>プロジェクト</span>
        <span>撮影日</span>
        <span>編集状態</span>
        <span>承認状態</span>
        <span>公開範囲</span>
      </div>

      {/* Data rows */}
      {assets.map((asset) => {
        const isVideo = isVideoType(asset.assetType);
        const duration = asset.files.find((f) =>
          ["ORIGINAL", "SELECTED_ORIGINAL", "PREVIEW"].includes(f.fileRole)
        )?.durationSeconds;

        return (
          <div
            key={asset.id}
            className={cn(
              "grid grid-cols-[2rem_3rem_2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-3 text-sm border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors items-center",
              selectedIds.has(asset.id) && "bg-blue-50"
            )}
          >
            {/* Checkbox */}
            <button
              onClick={() => onToggle(asset.id)}
              className={cn(
                "flex items-center justify-center",
                selectedIds.has(asset.id) ? "text-blue-500" : "text-gray-200 hover:text-gray-400"
              )}
            >
              <CheckSquare className="h-3.5 w-3.5" />
            </button>

            {/* Thumbnail */}
            <button
              onClick={() => onPreview(asset)}
              className="w-10 h-7 bg-gray-100 rounded overflow-hidden shrink-0 hover:opacity-80 transition-opacity"
            >
              <img
                src={`/api/assets/${asset.id}/thumbnail`}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </button>

            {/* Title */}
            <div className="min-w-0">
              <button
                onClick={() => onPreview(asset)}
                className="text-gray-900 font-medium truncate block hover:text-blue-700 text-left w-full text-sm"
              >
                {asset.title ?? asset.assetCode}
              </button>
              <p className="text-gray-400 text-xs truncate">{asset.assetCode}</p>
            </div>

            {/* Type */}
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {isVideo ? <span>🎬</span> : <span>🖼️</span>}
              <span className="truncate">
                {ASSET_TYPE_LABEL[asset.assetType] ?? asset.assetType}
                {isVideo && duration != null && (
                  <span className="ml-1 text-gray-400 font-mono">{formatDuration(duration)}</span>
                )}
              </span>
            </div>

            {/* Project */}
            <span className="text-xs text-gray-500 truncate">
              {asset.project?.name ?? "—"}
            </span>

            {/* Shoot date */}
            <span className="text-xs text-gray-400">
              {formatDate(asset.shoot?.shootDate)}
            </span>

            {/* Production status */}
            <ListBadge
              label={PRODUCTION_STATUS_LABEL[asset.productionStatus] ?? asset.productionStatus}
            />

            {/* Review status */}
            <ListBadge
              label={REVIEW_STATUS_LABEL[asset.reviewStatus] ?? asset.reviewStatus}
              className={REVIEW_STATUS_COLOR[asset.reviewStatus]}
            />

            {/* Visibility */}
            <span className="text-xs text-gray-500 truncate">
              {VISIBILITY_LABEL[asset.visibility] ?? asset.visibility}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ListBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap",
        className ?? "bg-gray-100 text-gray-600"
      )}
    >
      {label}
    </span>
  );
}
