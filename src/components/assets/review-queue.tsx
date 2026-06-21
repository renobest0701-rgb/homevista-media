"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Clock, AlertTriangle, CheckSquare } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

type Permission = {
  status: string;
  validUntil?: Date | string | null;
  permissionType: string;
};

type Asset = {
  id: string;
  assetCode: string;
  assetType: string;
  title?: string | null;
  peoplePresent: boolean;
  shoot?: {
    shootDate?: string | Date;
    project?: { name: string };
    permissions: Permission[];
  } | null;
  tags: { tag: { labelJa: string } }[];
};

function getTrafficLight(asset: Asset): "green" | "yellow" | "red" {
  const perms = asset.shoot?.permissions ?? [];

  // Red: no permission or expired
  const hasExpired = perms.some((p) => p.status === "EXPIRED");
  const hasNone = perms.length === 0;
  if (hasExpired || hasNone) return "red";

  // Yellow: person present, suggested tags, near expiry
  const hasPerson = asset.peoplePresent;
  const hasSuggestedTags = asset.tags.length > 0;
  const hasExpiringPermission = perms.some((p) => {
    if (!p.validUntil) return false;
    const days = (new Date(p.validUntil).getTime() - Date.now()) / (1000 * 3600 * 24);
    return days < 30;
  });

  if (hasPerson || hasSuggestedTags || hasExpiringPermission) return "yellow";

  return "green";
}

export function ReviewQueue({ assets }: { assets: Asset[] }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/assets/${id}/approve`, { method: "POST" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      fetch(`/api/assets/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      setRejectTarget(null);
      setRejectReason("");
    },
  });

  const greenAssets = assets.filter((a) => getTrafficLight(a) === "green");
  const yellowAssets = assets.filter((a) => getTrafficLight(a) === "yellow");
  const redAssets = assets.filter((a) => getTrafficLight(a) === "red");

  const handleBulkApprove = async () => {
    for (const id of Array.from(selected)) {
      await approveMutation.mutateAsync(id);
    }
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-white">確認・承認キュー</h1>
        {selected.size > 0 && (
          <button
            onClick={handleBulkApprove}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            <CheckSquare className="h-4 w-4" />
            選択した {selected.size} 件を一括承認
          </button>
        )}
      </div>

      {/* Green section */}
      <Section
        title="一括承認可能"
        color="green"
        count={greenAssets.length}
        icon={CheckCircle}
        assets={greenAssets}
        selected={selected}
        onToggle={toggleSelect}
        onApprove={(id) => approveMutation.mutate(id)}
        onReject={setRejectTarget}
      />

      {/* Yellow section */}
      <Section
        title="要確認"
        color="yellow"
        count={yellowAssets.length}
        icon={AlertTriangle}
        assets={yellowAssets}
        selected={selected}
        onToggle={toggleSelect}
        onApprove={(id) => approveMutation.mutate(id)}
        onReject={setRejectTarget}
      />

      {/* Red section */}
      <Section
        title="公開不可"
        color="red"
        count={redAssets.length}
        icon={XCircle}
        assets={redAssets}
        selected={selected}
        onToggle={toggleSelect}
        onApprove={(id) => approveMutation.mutate(id)}
        onReject={setRejectTarget}
      />

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white font-medium mb-4">却下理由を入力</h2>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="却下の理由を詳しく記入してください..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none resize-none mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => rejectMutation.mutate({ id: rejectTarget, reason: rejectReason })}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                className="px-4 py-2 text-sm bg-red-700 hover:bg-red-600 text-white rounded-lg disabled:opacity-40 transition-colors"
              >
                却下する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title, color, count, icon: Icon, assets, selected, onToggle, onApprove, onReject,
}: {
  title: string;
  color: "green" | "yellow" | "red";
  count: number;
  icon: typeof CheckCircle;
  assets: Asset[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const colorMap = {
    green: "text-green-400 bg-green-400/10 border-green-400/20",
    yellow: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    red: "text-red-400 bg-red-400/10 border-red-400/20",
  };

  if (count === 0) return null;

  return (
    <div className="mb-8">
      <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium mb-4", colorMap[color])}>
        <Icon className="h-3.5 w-3.5" />
        {title} ({count} 件)
      </div>

      <div className="space-y-2">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 hover:border-zinc-700 transition-colors"
          >
            {color === "green" && (
              <input
                type="checkbox"
                checked={selected.has(asset.id)}
                onChange={() => onToggle(asset.id)}
                className="h-4 w-4 accent-white"
              />
            )}

            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {asset.title ?? asset.assetCode}
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-zinc-500">{asset.assetCode}</span>
                <span className="text-xs text-zinc-600">·</span>
                <span className="text-xs text-zinc-500">
                  {asset.shoot?.project?.name ?? "—"}
                </span>
                <span className="text-xs text-zinc-600">·</span>
                <span className="text-xs text-zinc-500">
                  {formatDate(asset.shoot?.shootDate as string | null)}
                </span>
                {asset.peoplePresent && (
                  <span className="text-xs text-orange-400">人物あり</span>
                )}
                {asset.tags.length > 0 && (
                  <span className="text-xs text-blue-400">
                    未確認タグ {asset.tags.length} 件
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onApprove(asset.id)}
                className="px-3 py-1.5 text-xs bg-green-900 hover:bg-green-800 text-green-300 rounded-lg transition-colors"
              >
                承認
              </button>
              <button
                onClick={() => onReject(asset.id)}
                className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
              >
                却下
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
