"use client";

import { useState } from "react";
import {
  FolderOpen,
  Camera,
  Upload,
  CheckSquare,
  Package,
  ChevronDown,
  ChevronRight,
  Info,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type Phase = {
  id: string;
  icon: React.ElementType;
  title: string;
  desc: string;
  steps: {
    title: string;
    required?: boolean;
    items: { label: string; desc: string; required?: boolean }[];
    notes?: string[];
  }[];
};

const phases: Phase[] = [
  {
    id: "project",
    icon: FolderOpen,
    title: "フェーズ 1 — プロジェクト登録",
    desc: "物件ごとにプロジェクトを作成します。",
    steps: [
      {
        title: "プロジェクト新規作成",
        items: [
          { label: "プロジェクト名", desc: "内部管理用の名称（例：赤坂タワー2026春）", required: true },
          { label: "物件名", desc: "エンドクライアントに表示する物件の正式名称", required: true },
          { label: "物件コード", desc: "自動採番（変更可）。請求書・ファイル名の接頭辞になります" },
          { label: "物件タイプ", desc: "RESIDENTIAL / COMMERCIAL / HOTEL / RETAIL / OTHER" },
          { label: "都道府県・住所", desc: "撮影場所の特定に使用" },
          { label: "クライアント企業名", desc: "外部表示用（任意）" },
          { label: "担当PM", desc: "案件の進捗管理責任者", required: true },
          { label: "メモ", desc: "クライアントへの特記事項や社内申し送り事項" },
        ],
      },
    ],
  },
  {
    id: "shoot",
    icon: Camera,
    title: "フェーズ 2 — 撮影案件作成",
    desc: "プロジェクト内に1回の撮影ごとに撮影案件を登録します。",
    steps: [
      {
        title: "撮影案件の基本情報",
        items: [
          { label: "案件名", desc: "例：外観・エントランス撮影（2026-03-15）", required: true },
          { label: "撮影日", desc: "実施予定日または実施日" },
          { label: "スタイリスト要否", desc: "ステージング・家具配置の手配状況を記録" },
          { label: "メモ", desc: "撮影指示・カメラマンへの備考" },
        ],
        notes: ["1プロジェクトに複数の撮影案件を紐付けられます（外観、室内、空撮など）"],
      },
      {
        title: "撮影場所の登録",
        items: [
          { label: "場所名", desc: "例：リビングダイニング、エントランスホール", required: true },
          { label: "場所タイプ", desc: "PROPERTY / STATION / PARK / BEACH / STREET / FACILITY / NATURE / OTHER" },
          { label: "住所・座標", desc: "地図連携・ロケハン記録用（任意）" },
          { label: "備考", desc: "アクセス情報・鍵の場所など" },
        ],
      },
      {
        title: "撮影許可の記録",
        items: [
          { label: "許可種別", desc: "FILMING / AERIAL / INTERIOR / PUBLIC_SPACE / PRIVATE_PROPERTY / OTHER" },
          { label: "発行機関", desc: "管轄の役所名・施設名" },
          { label: "許可番号", desc: "書類番号（任意）" },
          { label: "有効期限", desc: "期限切れアラートの基準日" },
        ],
      },
    ],
  },
  {
    id: "upload",
    icon: Upload,
    title: "フェーズ 3 — 素材アップロード",
    desc: "3ステップのウィザードで写真・動画をアップロードします。",
    steps: [
      {
        title: "Step 1 — ファイル選択",
        items: [
          { label: "ファイル形式", desc: "写真：JPG / PNG / WEBP / TIFF / RAW (CR2, ARW, NEF)　動画：MP4 / MOV / MXF / AVI / MKV" },
          { label: "最大ファイルサイズ", desc: "1ファイルあたり 2 GB（動画）、500 MB（写真）" },
          { label: "一括選択", desc: "複数ファイルを同時にドラッグ＆ドロップ可能" },
        ],
      },
      {
        title: "Step 2 — 素材情報の入力",
        items: [
          { label: "プロジェクト", desc: "紐付け先のプロジェクトを選択", required: true },
          { label: "撮影案件", desc: "紐付け先の撮影案件（省略可）" },
          { label: "撮影場所", desc: "案件に登録済みの場所から選択（省略可）" },
          { label: "メディアタイプ", desc: "PHOTO / VIDEO / RAW / DOCUMENT / OTHER（自動判定）" },
          { label: "タグ", desc: "外観・内観・空撮・夜景など複数選択可" },
          { label: "説明", desc: "カメラマンメモ・使用用途など" },
          { label: "使用制限", desc: "UNRESTRICTED / SOCIAL_MEDIA / PRINT / WEB / INTERNAL_ONLY" },
        ],
      },
      {
        title: "Step 3 — 確認とアップロード実行",
        items: [
          { label: "サムネイル確認", desc: "自動生成プレビューで内容を最終確認" },
          { label: "アップロード開始", desc: "Alibaba Cloud OSS（東京リージョン）へ直接転送" },
          { label: "進捗表示", desc: "ファイルごとの進行状況をリアルタイム表示" },
        ],
        notes: [
          "アップロード後、ステータスは PENDING（審査待ち）になります",
          "RAWファイルはプレビュー生成に数分かかることがあります",
        ],
      },
    ],
  },
  {
    id: "review",
    icon: CheckSquare,
    title: "フェーズ 4 — 確認・承認",
    desc: "PMが素材をレビューし、承認またはリジェクトします。",
    steps: [
      {
        title: "レビューキューの操作",
        items: [
          { label: "PENDING 一覧", desc: "未審査の素材が時系列で表示されます" },
          { label: "承認（APPROVE）", desc: "ステータスが APPROVED に変わりクライアントに公開されます" },
          { label: "リジェクト（REJECT）", desc: "差し戻し理由を必ず記入してください。再アップロード依頼が送信されます" },
          { label: "フィードバック", desc: "修正依頼の詳細コメント（任意）" },
        ],
        notes: [
          "CLIENT_ADMIN 以上のロールも承認可能です",
          "SUPER_ADMIN は全プロジェクトのキューを横断して確認できます",
        ],
      },
    ],
  },
  {
    id: "delivery",
    icon: Package,
    title: "フェーズ 5 — 納品",
    desc: "承認済み素材をパッケージ化してクライアントへ届けます。",
    steps: [
      {
        title: "納品パッケージ作成",
        items: [
          { label: "素材の選択", desc: "APPROVED ステータスの素材から選択" },
          { label: "形式", desc: "ZIP / ダウンロードリンク / 共有URL（有効期限付き）" },
          { label: "ウォーターマーク", desc: "プレビュー用：クライアントロゴ入り低解像度版を自動生成" },
          { label: "納品メモ", desc: "クライアント宛てのメッセージ" },
        ],
        notes: [
          "共有URLは最大30日間有効（延長可能）",
          "ダウンロード回数・日時はログに記録されます",
        ],
      },
    ],
  },
];

const StatusBadge = ({ label, color }: { label: string; color: "green" | "yellow" | "blue" | "gray" }) => {
  const cls = {
    green: "bg-green-50 text-green-700 border-green-100",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    gray: "bg-gray-50 text-gray-600 border-gray-200",
  }[color];
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>{label}</span>;
};

export default function HelpPage() {
  const [openPhases, setOpenPhases] = useState<Set<string>>(new Set(["project"]));

  const toggle = (id: string) => {
    setOpenPhases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">使い方ガイド</h1>
        <p className="mt-1 text-sm text-gray-500">
          HOMEVISTA Media Asset Platform の操作手順をフェーズごとに説明します。
        </p>
      </div>

      {/* Status legend */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">ステータス一覧</p>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label="PENDING — 審査待ち" color="yellow" />
          <StatusBadge label="APPROVED — 承認済み" color="green" />
          <StatusBadge label="REJECTED — 差し戻し" color="gray" />
          <StatusBadge label="ACTIVE — 進行中" color="blue" />
          <StatusBadge label="COMPLETED — 完了" color="green" />
        </div>
      </div>

      {/* Phases */}
      {phases.map((phase) => {
        const open = openPhases.has(phase.id);
        const Icon = phase.icon;
        return (
          <div key={phase.id} className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Phase header */}
            <button
              onClick={() => toggle(phase.id)}
              className="w-full flex items-center gap-3 px-5 py-4 bg-white hover:bg-gray-50 text-left transition-colors"
            >
              <div className="flex-shrink-0 w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                <Icon className="h-4 w-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{phase.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{phase.desc}</p>
              </div>
              {open ? (
                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
            </button>

            {/* Phase content */}
            {open && (
              <div className="border-t border-gray-100 bg-white divide-y divide-gray-50">
                {phase.steps.map((step, si) => (
                  <div key={si} className="px-5 py-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-700">{step.title}</p>

                    <div className="space-y-2">
                      {step.items.map((item, ii) => (
                        <div key={ii} className="flex gap-3">
                          <div className="flex-1 flex items-baseline gap-2 flex-wrap">
                            <span className="text-sm text-gray-900 font-medium min-w-[8rem]">
                              {item.label}
                            </span>
                            {item.required && (
                              <span className="text-xs text-red-500 font-medium">必須</span>
                            )}
                            <span className="text-sm text-gray-500">{item.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {step.notes && step.notes.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {step.notes.map((note, ni) => (
                          <div key={ni} className="flex items-start gap-2 text-xs text-gray-500">
                            <Info className="h-3.5 w-3.5 mt-0.5 text-blue-400 flex-shrink-0" />
                            {note}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Quick tips */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-blue-500" />
          <p className="text-sm font-semibold text-blue-800">よくある確認ポイント</p>
        </div>
        <ul className="space-y-2 text-sm text-blue-700">
          <li className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
            素材は承認後にクライアントへ公開されます。リジェクト時は必ずコメントを入力してください。
          </li>
          <li className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
            検索窓（⌘K）でプロジェクト・撮影案件・素材をまとめて横断検索できます。
          </li>
          <li className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
            タグを事前に管理画面 → タグで整備しておくとフィルタリングが効果的になります。
          </li>
        </ul>
      </div>
    </div>
  );
}
