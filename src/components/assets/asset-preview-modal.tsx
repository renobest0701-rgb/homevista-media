"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { isVideoType } from "./asset-card";
import type { Asset } from "./asset-card";

interface AssetPreviewModalProps {
  asset: Asset;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function AssetPreviewModal({
  asset,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: AssetPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isVideo = isVideoType(asset.assetType);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setPreviewUrl(null);

    fetch(`/api/assets/${asset.id}/download-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileRole: isVideo ? "PREVIEW" : "THUMBNAIL",
        expiresInSeconds: 1800,
      }),
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.url) setPreviewUrl(d.url);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => controller.abort();
  }, [asset.id, isVideo]);

  // Keyboard nav
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev && onPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext && onNext) onNext();
    },
    [onClose, onPrev, onNext, hasPrev, hasNext]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Prev button */}
      {hasPrev && onPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {/* Next button */}
      {hasNext && onNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      <div
        className="relative bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-5xl flex flex-col"
        style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {asset.title ?? asset.assetCode}
            </p>
            <p className="text-xs text-gray-400">{asset.assetCode}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`/assets/${asset.id}`}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              詳細を開く
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center"
          style={{ minHeight: "300px", maxHeight: "calc(92vh - 56px)" }}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="h-8 w-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
              <p className="text-sm text-white/50">プレビュー読み込み中...</p>
            </div>
          ) : previewUrl ? (
            isVideo ? (
              <video
                src={previewUrl}
                controls
                autoPlay
                className="max-w-full max-h-full rounded"
                style={{ maxHeight: "calc(92vh - 56px)" }}
              />
            ) : (
              <img
                src={previewUrl}
                alt={asset.title ?? asset.assetCode}
                className="max-w-full max-h-full object-contain"
                style={{ maxHeight: "calc(92vh - 56px)" }}
              />
            )
          ) : (
            <div className="text-center py-16">
              <p className="text-white/50 text-sm mb-4">プレビューを表示できません</p>
              <a
                href={`/assets/${asset.id}`}
                className="text-sm text-white/70 underline hover:text-white"
              >
                詳細ページで確認する →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
