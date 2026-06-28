"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Globe, Plus, Key, RefreshCw, CheckCircle, Clock,
  Eye, EyeOff, ChevronRight, AlertCircle, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

type Site = {
  id: string;
  name: string;
  code: string;
  domain: string | null;
  type: string;
  status: string;
  description: string | null;
  allowedOrigins: string[];
  _count: { publications: number };
};

type Publication = {
  id: string;
  publicationStatus: string;
  channelType: string;
  publishFrom: string | null;
  publishUntil: string | null;
  publishedAt: string | null;
  pageUrl: string | null;
  asset: { id: string; assetCode: string; title: string | null; assetType: string };
  site: { id: string; name: string; code: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "下書き", SCHEDULED: "予約済", PUBLISHED: "公開中",
  UNPUBLISHED: "非公開", ERROR: "エラー",
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-500",
  SCHEDULED: "bg-yellow-50 text-yellow-700",
  PUBLISHED: "bg-green-50 text-green-700",
  UNPUBLISHED: "bg-gray-100 text-gray-400",
  ERROR: "bg-red-50 text-red-600",
};

export default function PublicationsPage() {
  const qc = useQueryClient();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const { data: sitesRaw, isLoading: sitesLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: () => fetch("/api/sites").then((r) => r.json()),
  });
  const sites: Site[] = Array.isArray(sitesRaw) ? sitesRaw : [];

  const { data: pubsRaw, isLoading: pubsLoading } = useQuery({
    queryKey: ["publications", selectedSiteId],
    queryFn: () =>
      fetch(`/api/publications${selectedSiteId ? `?siteId=${selectedSiteId}&limit=50` : "?limit=50"}`).then((r) => r.json()),
    enabled: true,
  });
  const publications: Publication[] = pubsRaw?.data ?? [];

  const publishMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/publications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicationStatus: status }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["publications"] }),
  });

  const rotateKeyMutation = useMutation({
    mutationFn: (siteId: string) =>
      fetch(`/api/sites/${siteId}/api-key`, { method: "POST" }).then((r) => r.json()),
    onSuccess: (data) => {
      setNewApiKey(data.apiKey ?? null);
      qc.invalidateQueries({ queryKey: ["sites"] });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: (siteId: string) =>
      fetch(`/api/sites/${siteId}/api-key`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sites"] }),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">掲載先管理</h1>
        <p className="text-xs text-gray-400 mt-0.5">サイト・チャンネルへの素材公開を管理します</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Site list */}
        <div className="w-64 flex-shrink-0 border-r border-gray-100 overflow-y-auto">
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">サイト一覧</p>
            {sitesLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedSiteId(null)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors",
                    !selectedSiteId
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <p className="font-medium">すべて</p>
                </button>
                {sites.map((site) => (
                  <button
                    key={site.id}
                    onClick={() => setSelectedSiteId(site.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors",
                      selectedSiteId === site.id
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{site.name}</p>
                      <span className={cn(
                        "ml-2 flex-shrink-0 w-2 h-2 rounded-full",
                        site.status === "ACTIVE" ? "bg-green-400" : "bg-gray-300"
                      )} />
                    </div>
                    <p className={cn(
                      "text-xs mt-0.5",
                      selectedSiteId === site.id ? "text-gray-300" : "text-gray-400"
                    )}>
                      {site.code} · {site._count.publications}件公開
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Publications + Site detail */}
        <div className="flex-1 overflow-y-auto">
          {/* Site detail panel */}
          {selectedSiteId && (() => {
            const site = sites.find((s) => s.id === selectedSiteId);
            if (!site) return null;
            return (
              <div className="mx-8 mt-6 p-5 bg-white border border-gray-200 rounded-xl">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-900">{site.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {site.code}
                        {site.domain && ` · ${site.domain}`}
                        {` · ${site.type}`}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    site.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                  )}>
                    {site.status === "ACTIVE" ? "稼働中" : "停止中"}
                  </span>
                </div>

                {site.description && (
                  <p className="text-sm text-gray-500 mt-3">{site.description}</p>
                )}

                {/* API Key management */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5" />
                      APIキー
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => rotateKeyMutation.mutate(site.id)}
                        disabled={rotateKeyMutation.isPending}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 disabled:opacity-40"
                      >
                        <RefreshCw className={cn("h-3 w-3", rotateKeyMutation.isPending && "animate-spin")} />
                        再発行
                      </button>
                      <button
                        onClick={() => revokeKeyMutation.mutate(site.id)}
                        disabled={revokeKeyMutation.isPending}
                        className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  {newApiKey ? (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertCircle className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-yellow-800 font-medium mb-1">このキーは一度だけ表示されます。必ず保存してください。</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-yellow-900 bg-yellow-100 px-2 py-1 rounded flex-1 overflow-x-auto">
                            {showApiKey === site.id ? newApiKey : "hvk_" + "•".repeat(20)}
                          </code>
                          <button onClick={() => setShowApiKey(showApiKey === site.id ? null : site.id)}>
                            {showApiKey === site.id
                              ? <EyeOff className="h-3.5 w-3.5 text-yellow-600" />
                              : <Eye className="h-3.5 w-3.5 text-yellow-600" />}
                          </button>
                        </div>
                      </div>
                      <button onClick={() => setNewApiKey(null)}>
                        <X className="h-3.5 w-3.5 text-yellow-500" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      {/* We can't tell if a key exists without a separate flag — show generic hint */}
                      APIキーを設定するとサイトAPIへのアクセスが制限されます
                    </p>
                  )}
                </div>

                {/* Allowed origins */}
                {site.allowedOrigins.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-600 mb-1.5">許可オリジン</p>
                    <div className="flex flex-wrap gap-1.5">
                      {site.allowedOrigins.map((o) => (
                        <span key={o} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-mono">
                          {o}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Publications list */}
          <div className="px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-900">
                掲載一覧
                {publications.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400">{pubsRaw?.total ?? publications.length}件</span>
                )}
              </p>
            </div>

            {pubsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : publications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <Globe className="h-10 w-10 text-gray-200 mb-3" />
                <p className="text-gray-400 text-sm">掲載データがありません</p>
                <p className="text-gray-300 text-xs mt-1">素材ライブラリから素材を選んで掲載先に追加してください</p>
              </div>
            ) : (
              <div className="space-y-2">
                {publications.map((pub) => (
                  <div
                    key={pub.id}
                    className="flex items-center justify-between px-5 py-4 bg-white border border-gray-200 rounded-xl"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {pub.asset.title ?? pub.asset.assetCode}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {pub.asset.assetCode}
                          {pub.site && ` · ${pub.site.name}`}
                          {` · ${pub.channelType}`}
                          {pub.publishFrom && ` · ${formatDate(pub.publishFrom)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        STATUS_COLOR[pub.publicationStatus] ?? "bg-gray-100 text-gray-500"
                      )}>
                        {STATUS_LABEL[pub.publicationStatus] ?? pub.publicationStatus}
                      </span>
                      {/* Quick action buttons */}
                      {pub.publicationStatus === "DRAFT" && (
                        <button
                          onClick={() => publishMutation.mutate({ id: pub.id, status: "PUBLISHED" })}
                          disabled={publishMutation.isPending}
                          className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 disabled:opacity-40"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          公開
                        </button>
                      )}
                      {pub.publicationStatus === "SCHEDULED" && (
                        <button
                          onClick={() => publishMutation.mutate({ id: pub.id, status: "PUBLISHED" })}
                          disabled={publishMutation.isPending}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40"
                        >
                          <Clock className="h-3.5 w-3.5" />
                          今すぐ公開
                        </button>
                      )}
                      {pub.publicationStatus === "PUBLISHED" && (
                        <button
                          onClick={() => publishMutation.mutate({ id: pub.id, status: "UNPUBLISHED" })}
                          disabled={publishMutation.isPending}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-40"
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                          非公開
                        </button>
                      )}
                      {pub.pageUrl && (
                        <a
                          href={pub.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-300 hover:text-gray-600"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
