"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, FolderOpen, Camera, Library, X } from "lucide-react";

type Result = {
  type: "project" | "shoot" | "asset";
  id: string;
  title: string;
  sub: string;
  status: string;
  href: string;
};

const typeIcon = { project: FolderOpen, shoot: Camera, asset: Library };
const typeLabel = { project: "プロジェクト", shoot: "撮影案件", asset: "素材" };

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const go = (href: string) => {
    router.push(href);
    setOpen(false);
    setQ("");
    setResults([]);
  };

  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:text-gray-600 transition-colors"
      >
        <Search className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="flex-1 text-left text-xs">検索...</span>
        <span className="text-xs text-gray-300 hidden sm:block">⌘K</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-gray-900/40 z-50 flex items-start justify-center pt-[10vh]"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden mx-4">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
              <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="プロジェクト・撮影案件・素材を検索..."
                className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none"
              />
              {q && (
                <button onClick={() => setQ("")} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-1.5 py-0.5">
                ESC
              </button>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {loading && (
                <div className="px-4 py-6 text-center text-sm text-gray-400">検索中...</div>
              )}

              {!loading && q && results.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  「{q}」に一致する結果がありません
                </div>
              )}

              {!loading && !q && (
                <div className="px-4 py-5 text-xs text-gray-400 text-center">
                  キーワードを入力してください
                </div>
              )}

              {(["project", "shoot", "asset"] as const).map((type) => {
                const items = grouped[type];
                if (!items?.length) return null;
                const Icon = typeIcon[type];
                return (
                  <div key={type} className="py-2">
                    <div className="px-4 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {typeLabel[type]}
                    </div>
                    {items.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => go(r.href)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                      >
                        <div className="flex-shrink-0 w-7 h-7 bg-gray-100 rounded-md flex items-center justify-center">
                          <Icon className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{r.title}</p>
                          {r.sub && <p className="text-xs text-gray-400 truncate">{r.sub}</p>}
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          r.status === "ACTIVE" || r.status === "APPROVED" || r.status === "COMPLETED"
                            ? "bg-green-50 text-green-600"
                            : r.status === "IN_PROGRESS" || r.status === "PENDING"
                            ? "bg-yellow-50 text-yellow-600"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {r.status}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
              <span>↵ 移動</span>
              <span>ESC 閉じる</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
