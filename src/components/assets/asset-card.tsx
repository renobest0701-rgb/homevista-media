"use client";

import Link from "next/link";
import { Video, Image, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";

type AssetFile = {
  id: string;
  fileRole: string;
  objectKey: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
};

type Asset = {
  id: string;
  assetCode: string;
  assetType: string;
  productionStatus: string;
  reviewStatus: string;
  rightsStatus: string;
  title?: string;
  primarySeason?: string;
  primaryTimeOfDay?: string;
  files: AssetFile[];
  project?: { id: string; name: string };
};

const STATUS_ICONS = {
  PENDING: { icon: Clock, color: "text-yellow-400" },
  APPROVED: { icon: CheckCircle, color: "text-green-400" },
  REJECTED: { icon: XCircle, color: "text-red-400" },
  IN_REVIEW: { icon: AlertCircle, color: "text-blue-400" },
};

export function AssetCard({ asset }: { asset: Asset }) {
  const thumbnail = asset.files.find((f) => f.fileRole === "THUMBNAIL");
  const preview = asset.files.find((f) => f.fileRole === "PREVIEW");
  const isVideo = asset.assetType.includes("VIDEO");
  const StatusInfo =
    STATUS_ICONS[asset.reviewStatus as keyof typeof STATUS_ICONS] ??
    STATUS_ICONS.PENDING;
  const StatusIcon = StatusInfo.icon;

  const duration = asset.files.find((f) =>
    ["ORIGINAL", "SELECTED_ORIGINAL", "WEB_1080"].includes(f.fileRole)
  )?.durationSeconds;

  return (
    <Link href={`/assets/${asset.id}`} className="group block">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors">
        {/* Thumbnail */}
        <div className="aspect-video bg-zinc-800 relative overflow-hidden">
          {thumbnail ? (
            <img
              src={`/api/assets/${asset.id}/thumbnail`}
              alt={asset.title ?? asset.assetCode}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              {isVideo ? (
                <Video className="h-8 w-8 text-zinc-700" />
              ) : (
                <Image className="h-8 w-8 text-zinc-700" />
              )}
            </div>
          )}

          {/* Overlays */}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-2">
            {isVideo && duration && (
              <span className="bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                {formatDuration(duration)}
              </span>
            )}
            <StatusIcon
              className={cn("h-3.5 w-3.5 ml-auto", StatusInfo.color)}
            />
          </div>

          {/* Type badge */}
          <div className="absolute top-2 left-2">
            {isVideo ? (
              <Video className="h-3 w-3 text-white drop-shadow" />
            ) : (
              <Image className="h-3 w-3 text-white drop-shadow" />
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="p-3">
          <p className="text-white text-sm font-medium truncate leading-snug">
            {asset.title ?? asset.assetCode}
          </p>
          {asset.project && (
            <p className="text-zinc-500 text-xs mt-0.5 truncate">
              {asset.project.name}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
              {asset.productionStatus === "ORIGINAL"
                ? "原本"
                : asset.productionStatus === "EDITED"
                ? "編集済み"
                : asset.productionStatus === "FINAL_DELIVERY"
                ? "最終版"
                : asset.productionStatus}
            </span>
            {asset.primarySeason && (
              <span className="text-xs text-zinc-600">
                {asset.primarySeason === "SPRING"
                  ? "春"
                  : asset.primarySeason === "SUMMER"
                  ? "夏"
                  : asset.primarySeason === "AUTUMN"
                  ? "秋"
                  : asset.primarySeason === "WINTER"
                  ? "冬"
                  : asset.primarySeason}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
