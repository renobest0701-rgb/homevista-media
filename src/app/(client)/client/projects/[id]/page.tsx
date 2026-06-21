"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download, Video, Image, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatDuration, formatDate } from "@/lib/utils";

type AssetFile = {
  id: string;
  fileRole: string;
  mimeType?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  url: string;
};

type Asset = {
  id: string;
  assetCode: string;
  assetType: string;
  productionStatus: string;
  title?: string;
  canDownload: boolean;
  tags: { code: string; labelJa: string }[];
  files: AssetFile[];
};

export default function ClientProjectAssetsPage() {
  const params = useParams();
  const projectId = String(params.id);

  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ["client-project-assets", projectId],
    queryFn: () =>
      fetch(`/api/client/projects/${projectId}/assets`).then((r) => r.json()),
  });

  const handleDownload = async (assetId: string) => {
    const res = await fetch(`/api/assets/${assetId}/download-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresInSeconds: 3600 }),
    });
    const data = await res.json();
    if (data.url) {
      const a = document.createElement("a");
      a.href = data.url;
      a.download = "";
      a.click();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <Link
        href="/client/dashboard"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-900 text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        プロジェクト一覧へ
      </Link>

      <h1 className="text-xl font-bold text-gray-900 mb-6">素材一覧</h1>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <p className="text-gray-400 text-sm">公開中の素材はありません</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map((asset) => {
            const thumbnail = asset.files.find((f) => f.fileRole === "THUMBNAIL");
            const preview = asset.files.find((f) => f.fileRole === "PREVIEW");
            const isVideo = asset.assetType.includes("VIDEO");
            const duration = asset.files.find((f) =>
              ["WEB_1080", "CLIENT_DELIVERY"].includes(f.fileRole)
            )?.durationSeconds;

            return (
              <div
                key={asset.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden group"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {thumbnail ? (
                    <img
                      src={thumbnail.url}
                      alt={asset.title ?? asset.assetCode}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      {isVideo ? (
                        <Video className="h-8 w-8 text-gray-200" />
                      ) : (
                        <Image className="h-8 w-8 text-gray-200" />
                      )}
                    </div>
                  )}
                  {isVideo && duration && (
                    <div className="absolute bottom-2 left-2">
                      <span className="bg-gray-900/60 text-gray-900 text-xs px-1.5 py-0.5 rounded font-mono">
                        {formatDuration(duration)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-gray-900 text-sm font-medium truncate">
                    {asset.title ?? asset.assetCode}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {asset.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag.code}
                        className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded"
                      >
                        {tag.labelJa}
                      </span>
                    ))}
                  </div>

                  {asset.canDownload && (
                    <button
                      onClick={() => handleDownload(asset.id)}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-lg transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      ダウンロード
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
