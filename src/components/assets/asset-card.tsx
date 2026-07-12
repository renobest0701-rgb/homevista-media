"use client";

import Link from "next/link";
import { Video, Image as ImageIcon, Play, Info, Square, CheckSquare, Maximize2 } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AssetFile = {
  id: string;
  fileRole: string;
  objectKey: string;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  mimeType?: string | null;
};

export type Asset = {
  id: string;
  assetCode: string;
  assetType: string;
  productionStatus: string;
  reviewStatus: string;
  rightsStatus: string;
  visibility: string;
  title?: string | null;
  peoplePresent?: boolean;
  primarySeason?: string | null;
  primaryTimeOfDay?: string | null;
  files: AssetFile[];
  project?: { id: string; name: string; code?: string } | null;
  shoot?: { id: string; name: string; shootDate?: string | null } | null;
  tags?: { tag: { code: string; labelJa: string } }[];
};

// ─── Type helpers ─────────────────────────────────────────────────────────────

export function isVideoType(t: string) {
  return ["VIDEO", "DRONE_VIDEO", "VIDEO_360", "VR"].includes(t);
}
export function isImageType(t: string) {
  return ["IMAGE", "DRONE_IMAGE", "CG", "RAW"].includes(t);
}

// ─── Label / color maps ───────────────────────────────────────────────────────

export const ASSET_TYPE_LABEL: Record<string, string> = {
  VIDEO: "動画",
  IMAGE: "静止画",
  DRONE_VIDEO: "ドローン動画",
  DRONE_IMAGE: "ドローン静止画",
  VIDEO_360: "360動画",
  VR: "VR",
  CG: "CG",
  RAW: "RAW",
  AUDIO: "音声",
  DOCUMENT: "書類",
  THUMBNAIL: "サムネ",
};

export const PRODUCTION_STATUS_LABEL: Record<string, string> = {
  ORIGINAL: "原素材",
  EDITED: "編集中",
  FINAL_DELIVERY: "完成版",
  WEB_DELIVERY: "Web版",
  SNS_VERSION: "SNS版",
  ARCHIVED: "旧版",
};
const PRODUCTION_STATUS_COLOR: Record<string, string> = {
  ORIGINAL: "bg-slate-100 text-slate-600",
  EDITED: "bg-amber-50 text-amber-700",
  FINAL_DELIVERY: "bg-emerald-50 text-emerald-700",
  WEB_DELIVERY: "bg-blue-50 text-blue-700",
  SNS_VERSION: "bg-purple-50 text-purple-700",
  ARCHIVED: "bg-gray-100 text-gray-400",
};

export const REVIEW_STATUS_LABEL: Record<string, string> = {
  PENDING: "確認待ち",
  APPROVED: "承認済み",
  REJECTED: "却下",
  IN_REVIEW: "確認中",
  NEEDS_INFO: "要確認",
};
export const REVIEW_STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
  IN_REVIEW: "bg-blue-50 text-blue-700",
  NEEDS_INFO: "bg-orange-50 text-orange-700",
};

export const VISIBILITY_LABEL: Record<string, string> = {
  INTERNAL: "社内のみ",
  CLIENT_ONLY: "顧客共有",
  PUBLIC: "Web公開",
};
const VISIBILITY_COLOR: Record<string, string> = {
  INTERNAL: "bg-gray-100 text-gray-500",
  CLIENT_ONLY: "bg-indigo-50 text-indigo-700",
  PUBLIC: "bg-teal-50 text-teal-700",
};

// ─── Helper components ────────────────────────────────────────────────────────

function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap leading-none", className)}>
      {label}
    </span>
  );
}

function getDimensions(files: AssetFile[]) {
  const f = files.find(
    (f) => f.width && f.height && ["THUMBNAIL", "ORIGINAL", "SELECTED_ORIGINAL", "PREVIEW"].includes(f.fileRole)
  );
  if (!f?.width || !f?.height) return null;
  return { w: f.width, h: f.height, isLandscape: f.width >= f.height };
}

function getDuration(files: AssetFile[]) {
  return (
    files.find((f) =>
      ["ORIGINAL", "SELECTED_ORIGINAL", "PREVIEW", "WEB_1080"].includes(f.fileRole)
    )?.durationSeconds ?? null
  );
}

// ─── Image card ───────────────────────────────────────────────────────────────

function ImageCard({
  asset,
  checked,
  onToggle,
  onPreview,
}: {
  asset: Asset;
  checked: boolean;
  onToggle: () => void;
  onPreview: () => void;
}) {
  const dims = getDimensions(asset.files);

  return (
    <div
      className={cn(
        "bg-white border rounded-xl overflow-hidden transition-all group",
        checked
          ? "border-blue-400 ring-2 ring-blue-200"
          : "border-gray-200 hover:border-gray-400"
      )}
    >
      {/* Thumbnail area */}
      <div
        className="aspect-video bg-gray-100 relative overflow-hidden cursor-pointer"
        onClick={onPreview}
      >
        <img
          src={`/api/assets/${asset.id}/thumbnail`}
          alt={asset.title ?? asset.assetCode}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Maximize2 className="h-7 w-7 text-white drop-shadow-lg" />
        </div>

        {/* Type badge — top left */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded px-1.5 py-0.5 shadow-sm">
          <ImageIcon className="h-2.5 w-2.5 text-gray-700 shrink-0" />
          <span className="text-[10px] text-gray-700 font-medium leading-none">
            {ASSET_TYPE_LABEL[asset.assetType] ?? "静止画"}
          </span>
        </div>

        {/* Checkbox — top right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn(
            "absolute top-2 right-2 transition-opacity",
            checked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          title={checked ? "選択解除" : "選択"}
        >
          {checked ? (
            <CheckSquare className="h-4 w-4 text-blue-500 drop-shadow" />
          ) : (
            <Square className="h-4 w-4 text-white drop-shadow" />
          )}
        </button>

        {/* Dimensions — bottom left */}
        {dims && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <span className="bg-black/55 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
              {dims.isLandscape ? "横" : "縦"}
            </span>
            <span className="bg-black/55 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
              {dims.w}×{dims.h}
            </span>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-1.5">
          <p className="text-gray-900 text-sm font-medium truncate leading-snug flex-1">
            {asset.title ?? asset.assetCode}
          </p>
          <Link
            href={`/assets/${asset.id}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-gray-300 hover:text-gray-600 p-0.5 -mt-0.5 transition-colors"
            title="詳細を開く"
          >
            <Info className="h-3.5 w-3.5" />
          </Link>
        </div>
        {asset.project && (
          <p className="text-gray-400 text-xs mt-0.5 truncate">{asset.project.name}</p>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          <StatusBadge
            label={PRODUCTION_STATUS_LABEL[asset.productionStatus] ?? asset.productionStatus}
            className={PRODUCTION_STATUS_COLOR[asset.productionStatus] ?? "bg-gray-100 text-gray-600"}
          />
          <StatusBadge
            label={REVIEW_STATUS_LABEL[asset.reviewStatus] ?? asset.reviewStatus}
            className={REVIEW_STATUS_COLOR[asset.reviewStatus] ?? "bg-gray-100 text-gray-600"}
          />
          <StatusBadge
            label={VISIBILITY_LABEL[asset.visibility] ?? asset.visibility}
            className={VISIBILITY_COLOR[asset.visibility] ?? "bg-gray-100 text-gray-500"}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Video card ───────────────────────────────────────────────────────────────

function VideoCard({
  asset,
  checked,
  onToggle,
  onPreview,
}: {
  asset: Asset;
  checked: boolean;
  onToggle: () => void;
  onPreview: () => void;
}) {
  const dims = getDimensions(asset.files);
  const duration = getDuration(asset.files);

  return (
    <div
      className={cn(
        "bg-white border rounded-xl overflow-hidden transition-all group",
        checked
          ? "border-blue-400 ring-2 ring-blue-200"
          : "border-gray-200 hover:border-gray-400"
      )}
    >
      {/* Thumbnail area */}
      <div
        className="aspect-video bg-gray-900 relative overflow-hidden cursor-pointer"
        onClick={onPreview}
      >
        <img
          src={`/api/assets/${asset.id}/thumbnail`}
          alt={asset.title ?? asset.assetCode}
          className="w-full h-full object-cover opacity-80"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/50 group-hover:bg-black/70 rounded-full p-3 transition-colors shadow-lg">
            <Play className="h-6 w-6 text-white fill-white" />
          </div>
        </div>

        {/* Type badge — top left */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5">
          <Video className="h-2.5 w-2.5 text-white shrink-0" />
          <span className="text-[10px] text-white font-medium leading-none">
            {ASSET_TYPE_LABEL[asset.assetType] ?? "動画"}
          </span>
        </div>

        {/* Checkbox — top right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn(
            "absolute top-2 right-2 transition-opacity",
            checked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          title={checked ? "選択解除" : "選択"}
        >
          {checked ? (
            <CheckSquare className="h-4 w-4 text-blue-400 drop-shadow" />
          ) : (
            <Square className="h-4 w-4 text-white drop-shadow" />
          )}
        </button>

        {/* Bottom gradient bar */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-4 pb-2 flex items-end justify-between">
          <div className="flex items-center gap-1.5">
            {duration != null && (
              <span className="text-white text-xs font-mono font-medium">
                {formatDuration(duration)}
              </span>
            )}
            {dims && (
              <span className="text-white/70 text-[10px]">
                {dims.isLandscape ? "横型" : "縦型"}
              </span>
            )}
          </div>
          {dims && (
            <span className="text-white/60 text-[10px] font-mono">
              {dims.w}×{dims.h}
            </span>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-1.5">
          <p className="text-gray-900 text-sm font-medium truncate leading-snug flex-1">
            {asset.title ?? asset.assetCode}
          </p>
          <Link
            href={`/assets/${asset.id}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-gray-300 hover:text-gray-600 p-0.5 -mt-0.5 transition-colors"
            title="詳細を開く"
          >
            <Info className="h-3.5 w-3.5" />
          </Link>
        </div>
        {asset.project && (
          <p className="text-gray-400 text-xs mt-0.5 truncate">{asset.project.name}</p>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          <StatusBadge
            label={PRODUCTION_STATUS_LABEL[asset.productionStatus] ?? asset.productionStatus}
            className={PRODUCTION_STATUS_COLOR[asset.productionStatus] ?? "bg-gray-100 text-gray-600"}
          />
          <StatusBadge
            label={REVIEW_STATUS_LABEL[asset.reviewStatus] ?? asset.reviewStatus}
            className={REVIEW_STATUS_COLOR[asset.reviewStatus] ?? "bg-gray-100 text-gray-600"}
          />
          <StatusBadge
            label={VISIBILITY_LABEL[asset.visibility] ?? asset.visibility}
            className={VISIBILITY_COLOR[asset.visibility] ?? "bg-gray-100 text-gray-500"}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export function AssetCard({
  asset,
  checked = false,
  onToggle,
  onPreview,
}: {
  asset: Asset;
  checked?: boolean;
  onToggle?: () => void;
  onPreview?: () => void;
}) {
  const toggle = onToggle ?? (() => {});
  const preview = onPreview ?? (() => {});

  if (isVideoType(asset.assetType)) {
    return <VideoCard asset={asset} checked={checked} onToggle={toggle} onPreview={preview} />;
  }
  return <ImageCard asset={asset} checked={checked} onToggle={toggle} onPreview={preview} />;
}
