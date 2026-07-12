"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload, CheckCircle, AlertCircle, Loader2, X,
  FileVideo, FileImage, Plus, MapPin, Tag as TagIcon, Camera,
} from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ShootLocation = {
  id: string;
  location: { id: string; name: string; locationType: string };
};

type Shoot = {
  id: string;
  name: string;
  shootDate: Date | string;
  project: { id: string; name: string; propertyName?: string | null };
  teamOrg?: { name: string } | null;
  locations: ShootLocation[];
};

type UploadFile = {
  id: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
};

type TagOption = { id: string; code: string; labelJa: string; labelEn?: string };

type Step = 1 | 2 | 3 | 4;

type ShootMethod = "STANDARD" | "DRONE" | "VR_360" | "OTHER";

// ─── Enum-aligned constants ────────────────────────────────────────────────

const LOCATION_TYPES = [
  { value: "PROPERTY",  ja: "物件内",   zh: "物业内" },
  { value: "STATION",   ja: "駅周辺",   zh: "车站附近" },
  { value: "PARK",      ja: "公園",     zh: "公园" },
  { value: "BEACH",     ja: "海・海辺", zh: "海滩" },
  { value: "STREET",    ja: "街並み",   zh: "街道" },
  { value: "FACILITY",  ja: "施設",     zh: "设施" },
  { value: "NATURE",    ja: "自然",     zh: "自然" },
  { value: "OTHER",     ja: "その他",   zh: "其他" },
];

// Aligned with schema Weather enum
const WEATHER_OPTIONS = [
  { value: "SUNNY",          ja: "晴れ",           zh: "晴天" },
  { value: "CLOUDY",         ja: "曇り",           zh: "阴天" },
  { value: "RAINY",          ja: "雨",             zh: "雨天" },
  { value: "SNOWY",          ja: "雪",             zh: "雪天" },
  { value: "AFTER_TYPHOON",  ja: "台風後",         zh: "台风后" },
  { value: "NOT_APPLICABLE", ja: "室内・該当なし", zh: "室内/不适用" },
];

// Aligned with schema TimeOfDay enum
const TIME_OF_DAY_OPTIONS = [
  { value: "EARLY_MORNING", ja: "早朝",     zh: "凌晨/黎明" },
  { value: "MORNING",       ja: "朝",       zh: "早晨" },
  { value: "MIDDAY",        ja: "昼",       zh: "正午" },
  { value: "AFTERNOON",     ja: "午後",     zh: "下午" },
  { value: "DUSK",          ja: "夕暮れ",   zh: "黄昏" },
  { value: "TWILIGHT",      ja: "トワイライト", zh: "暮色" },
  { value: "NIGHT",         ja: "夜間",     zh: "夜间" },
  { value: "NIGHT_VIEW",    ja: "夜景",     zh: "夜景" },
];

const SHOOT_METHODS: { value: ShootMethod; ja: string; zh: string; icon: string }[] = [
  { value: "STANDARD", ja: "通常撮影",     zh: "常规拍摄",   icon: "📷" },
  { value: "DRONE",    ja: "ドローン撮影", zh: "无人机拍摄", icon: "🚁" },
  { value: "VR_360",   ja: "360°・VR",    zh: "360°/VR",   icon: "🔮" },
  { value: "OTHER",    ja: "その他",       zh: "其他",       icon: "📹" },
];

/** Infer AssetType from shoot method + MIME type */
function inferAssetType(method: ShootMethod, mimeType: string): string {
  const isVideo = mimeType.startsWith("video/");
  switch (method) {
    case "DRONE":  return isVideo ? "DRONE_VIDEO" : "DRONE_IMAGE";
    case "VR_360": return isVideo ? "VIDEO_360"   : "IMAGE";
    default:       return isVideo ? "VIDEO"        : "IMAGE";
  }
}

/** Determine dominant assetType for a batch (first video wins, else image) */
function inferBatchAssetType(method: ShootMethod, files: UploadFile[]): string {
  const firstMime = files[0]?.file.type ?? "image/jpeg";
  return inferAssetType(method, firstMime);
}

const T = {
  ja: {
    step1: "案件確認", step2: "撮影場所", step3: "詳細情報", step4: "アップロード",
    project: "プロジェクト", shoot: "撮影案件", date: "撮影日", team: "撮影チーム",
    location: "撮影場所を選択", next: "次へ", back: "戻る",
    startUpload: "アップロード開始", uploading: "アップロード中...",
    uploadDone: "アップロード完了", uploadDoneDesc: "素材は管理者の確認後に公開されます",
    dropZone: "動画・静止画をドラッグ＆ドロップ、またはクリックして選択",
    total: "合計", optional: "任意",
    peoplePresent: "人物が映っていますか？", yes: "はい", no: "いいえ",
    shootMethod: "撮影方法", tags: "タグ", weather: "天候", timeOfDay: "時間帯", notes: "補足メモ",
    addLocation: "新しい場所を追加", locationName: "場所名",
    locationType: "場所タイプ", createAndSelect: "作成して選択", cancel: "キャンセル",
    noLocations: "撮影場所が未登録です",
    uploadError: "アップロードに失敗しました。再試行してください。",
  },
  zh: {
    step1: "确认任务", step2: "拍摄地点", step3: "详细信息", step4: "上传",
    project: "项目", shoot: "拍摄任务", date: "拍摄日期", team: "摄影团队",
    location: "选择拍摄地点", next: "下一步", back: "返回",
    startUpload: "开始上传", uploading: "上传中...",
    uploadDone: "上传完成", uploadDoneDesc: "素材经管理员审核后发布",
    dropZone: "将视频/图片拖放到此处，或点击选择文件",
    total: "总计", optional: "选填",
    peoplePresent: "画面中是否有人物？", yes: "是", no: "否",
    shootMethod: "拍摄方式", tags: "标签", weather: "天气", timeOfDay: "时间段", notes: "备注",
    addLocation: "新增地点", locationName: "地点名称",
    locationType: "地点类型", createAndSelect: "创建并选择", cancel: "取消",
    noLocations: "尚无拍摄地点",
    uploadError: "上传失败，请重试。",
  },
};

export function UploadWizard({ shoot, uploadToken }: { shoot: Shoot; uploadToken?: string }) {
  const [lang, setLang] = useState<"ja" | "zh">("ja");
  const t = T[lang];
  const [step, setStep] = useState<Step>(1);

  // Step 2
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [locations, setLocations] = useState<ShootLocation[]>(shoot.locations);
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationType, setNewLocationType] = useState("PROPERTY");
  const [addingLocation, setAddingLocation] = useState(false);

  // Step 3
  const [shootMethod, setShootMethod] = useState<ShootMethod>("STANDARD");
  const [tags, setTags] = useState<TagOption[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [peoplePresent, setPeoplePresent] = useState(false);
  const [weather, setWeather] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [notes, setNotes] = useState("");

  // Step 4
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [allDone, setAllDone] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/masters/tags?limit=100")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setTags(d.data ?? d ?? []));
  }, []);

  const addNewLocation = async () => {
    if (!newLocationName.trim()) return;
    setAddingLocation(true);
    try {
      const locRes = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLocationName.trim(), locationType: newLocationType }),
      });
      if (!locRes.ok) return;
      const newLoc = await locRes.json();
      const linkRes = await fetch(`/api/shoots/${shoot.id}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: newLoc.id }),
      });
      if (!linkRes.ok) return;
      const shootLoc = await linkRes.json();
      setLocations((prev) => [
        ...prev,
        { id: shootLoc.id, location: { id: newLoc.id, name: newLoc.name, locationType: newLoc.locationType } },
      ]);
      setSelectedLocationId(newLoc.id);
      setNewLocationName("");
      setShowNewLocation(false);
    } finally {
      setAddingLocation(false);
    }
  };

  const toggleTag = (id: string) =>
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );

  const shootDateStr = new Date(shoot.shootDate).toLocaleDateString(
    lang === "zh" ? "zh-CN" : "ja-JP"
  );

  const onDrop = useCallback((newFiles: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...newFiles.map((f) => ({
        id: Math.random().toString(36).slice(2),
        file: f,
        status: "pending" as const,
        progress: 0,
      })),
    ]);
  }, []);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop(Array.from(e.dataTransfer.files));
  };
  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const startUpload = async () => {
    if (files.length === 0) return;
    setSessionError("");

    const assetType = inferBatchAssetType(shootMethod, files);

    // Token-based page → use public token-sessions endpoint (no auth cookie needed)
    // Logged-in uploader → use authenticated sessions endpoint
    const endpoint = uploadToken ? "/api/uploads/token-sessions" : "/api/uploads/sessions";
    const sessionRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(uploadToken ? { uploadToken } : { shootId: shoot.id }),
        shootLocationId: selectedLocationId || undefined,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        files: files.map((f) => ({
          originalFileName: f.file.name,
          mimeType: f.file.type || "application/octet-stream",
          sizeBytes: f.file.size,
          fileRole: "ORIGINAL",
        })),
        assetType,
        peoplePresent,
        weather: weather || undefined,
        primaryTimeOfDay: timeOfDay || undefined,
        notes: notes || undefined,
      }),
    });

    if (!sessionRes.ok) {
      const err = await sessionRes.json().catch(() => ({}));
      setSessionError((err as { error?: string }).error ?? t.uploadError);
      return;
    }

    const session = await sessionRes.json();

    const completedIds: string[] = [];
    const failedIds: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const fileInfo = session.files[i];
      const uploadFile = files[i];
      if (!fileInfo) continue;

      setFiles((prev) =>
        prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "uploading" } : f))
      );

      try {
        if (fileInfo.fields) {
          const formData = new FormData();
          Object.entries(fileInfo.fields as Record<string, string>).forEach(([k, v]) =>
            formData.append(k, v)
          );
          formData.append("file", uploadFile.file);
          const res = await fetch(fileInfo.uploadUrl, { method: "POST", body: formData });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } else {
          const res = await fetch(fileInfo.uploadUrl, {
            method: "PUT",
            body: uploadFile.file,
            headers: { "Content-Type": uploadFile.file.type || "application/octet-stream" },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        }
        completedIds.push(fileInfo.assetFileId);
        setFiles((prev) =>
          prev.map((f) => (f.id === uploadFile.id ? { ...f, status: "done", progress: 100 } : f))
        );
      } catch (err) {
        failedIds.push(fileInfo.assetFileId);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "error", error: String(err) } : f
          )
        );
      }
    }

    await fetch(`/api/uploads/${session.sessionId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completedFileIds: completedIds,
        failedFileIds: failedIds,
        ...(uploadToken ? { uploadToken } : {}),
      }),
    });

    if (failedIds.length === 0) setAllDone(true);
  };

  const totalSize = files.reduce((s, f) => s + f.file.size, 0);
  const isUploading = files.some((f) => f.status === "uploading");
  const stepLabels = [t.step1, t.step2, t.step3, t.step4] as const;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="font-bold text-sm tracking-tight">HOMEVISTA Upload</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(["ja", "zh"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={cn(
                "px-3 py-1 text-xs rounded-md transition-colors",
                lang === l ? "bg-gray-200 text-gray-900" : "text-gray-500"
              )}
            >
              {l === "ja" ? "日本語" : "中文"}
            </button>
          ))}
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex border-b border-gray-200 bg-white">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div
            key={s}
            className={cn(
              "flex-1 text-center py-3 text-xs font-medium transition-colors border-b-2",
              step === s
                ? "text-gray-900 border-gray-900"
                : step > s
                ? "text-green-500 border-transparent"
                : "text-gray-300 border-transparent"
            )}
          >
            <span className={cn(
              "inline-flex items-center justify-center w-5 h-5 rounded-full text-xs mr-1.5",
              step > s ? "bg-green-100 text-green-600" : step === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-400"
            )}>
              {step > s ? "✓" : s}
            </span>
            {stepLabels[s - 1]}
          </div>
        ))}
      </div>

      <div className="max-w-xl mx-auto px-6 py-8">

        {/* STEP 1: Shoot info */}
        {step === 1 && (
          <div className="space-y-4">
            <InfoRow label={t.shoot} value={shoot.name} />
            <InfoRow label={t.project} value={shoot.project.propertyName ?? shoot.project.name} />
            <InfoRow label={t.date} value={shootDateStr} />
            {shoot.teamOrg && <InfoRow label={t.team} value={shoot.teamOrg.name} />}
            <button
              onClick={() => setStep(2)}
              className="w-full bg-gray-900 text-white font-medium py-3 rounded-xl text-sm mt-6"
            >
              {t.next}
            </button>
          </div>
        )}

        {/* STEP 2: Location */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">{t.location}</label>
                <button
                  onClick={() => setShowNewLocation(!showNewLocation)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
                >
                  <Plus className="h-3 w-3" />
                  {t.addLocation}
                </button>
              </div>

              {locations.length > 0 ? (
                <div className="space-y-2">
                  {locations.map((sl) => (
                    <label
                      key={sl.id}
                      className={cn(
                        "flex items-center gap-3 p-3 bg-white border rounded-xl cursor-pointer transition-colors",
                        selectedLocationId === sl.location.id
                          ? "border-gray-900 ring-1 ring-gray-900"
                          : "border-gray-200 hover:border-gray-400"
                      )}
                    >
                      <input
                        type="radio"
                        name="location"
                        value={sl.location.id}
                        checked={selectedLocationId === sl.location.id}
                        onChange={(e) => setSelectedLocationId(e.target.value)}
                        className="sr-only"
                      />
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{sl.location.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {LOCATION_TYPES.find((lt) => lt.value === sl.location.locationType)?.[lang] ?? sl.location.locationType}
                        </p>
                      </div>
                      {selectedLocationId === sl.location.id && (
                        <CheckCircle className="h-4 w-4 text-gray-900 flex-shrink-0" />
                      )}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm py-2">{t.noLocations}</p>
              )}

              {showNewLocation && (
                <div className="mt-3 p-4 bg-white border border-gray-200 rounded-xl space-y-3">
                  <p className="text-xs font-medium text-gray-600">
                    {lang === "zh" ? "新建拍摄地点" : "新しい撮影場所を作成"}
                  </p>
                  <input
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder={t.locationName}
                    className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-gray-400"
                  />
                  <select
                    value={newLocationType}
                    onChange={(e) => setNewLocationType(e.target.value)}
                    className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none"
                  >
                    {LOCATION_TYPES.map((lt) => (
                      <option key={lt.value} value={lt.value}>
                        {lang === "zh" ? lt.zh : lt.ja}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowNewLocation(false)}
                      className="flex-1 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      {t.cancel}
                    </button>
                    <button
                      onClick={addNewLocation}
                      disabled={!newLocationName.trim() || addingLocation}
                      className="flex-1 py-2 text-xs bg-gray-900 text-white font-medium rounded-lg disabled:opacity-40"
                    >
                      {addingLocation ? "..." : t.createAndSelect}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-100">
                {t.back}
              </button>
              <button onClick={() => setStep(3)} className="flex-1 py-3 text-sm bg-gray-900 text-white font-medium rounded-xl">
                {t.next}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Metadata */}
        {step === 3 && (
          <div className="space-y-6">

            {/* Shoot method — drives assetType auto-detection */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-gray-400" />
                {t.shootMethod}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SHOOT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setShootMethod(m.value)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors",
                      shootMethod === m.value
                        ? "bg-gray-900 text-white border-gray-900"
                        : "border-gray-200 text-gray-600 hover:border-gray-400"
                    )}
                  >
                    <span>{m.icon}</span>
                    <span>{lang === "zh" ? m.zh : m.ja}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* People present */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{t.peoplePresent}</p>
              <div className="flex gap-3">
                {([true, false] as const).map((v) => (
                  <button
                    key={String(v)}
                    onClick={() => setPeoplePresent(v)}
                    className={cn(
                      "flex-1 py-2.5 text-sm rounded-xl border transition-colors",
                      peoplePresent === v
                        ? "bg-gray-900 text-white border-gray-900"
                        : "border-gray-200 text-gray-600 hover:border-gray-400"
                    )}
                  >
                    {v ? t.yes : t.no}
                  </button>
                ))}
              </div>
            </div>

            {/* Weather */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {t.weather} <span className="text-xs text-gray-400 font-normal">（{t.optional}）</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {WEATHER_OPTIONS.map((w) => (
                  <button
                    key={w.value}
                    onClick={() => setWeather(weather === w.value ? "" : w.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                      weather === w.value
                        ? "bg-gray-900 text-white border-gray-900"
                        : "border-gray-200 text-gray-600 hover:border-gray-400"
                    )}
                  >
                    {lang === "zh" ? w.zh : w.ja}
                  </button>
                ))}
              </div>
            </div>

            {/* Time of day */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {t.timeOfDay} <span className="text-xs text-gray-400 font-normal">（{t.optional}）</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {TIME_OF_DAY_OPTIONS.map((tod) => (
                  <button
                    key={tod.value}
                    onClick={() => setTimeOfDay(timeOfDay === tod.value ? "" : tod.value)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                      timeOfDay === tod.value
                        ? "bg-gray-900 text-white border-gray-900"
                        : "border-gray-200 text-gray-600 hover:border-gray-400"
                    )}
                  >
                    {lang === "zh" ? tod.zh : tod.ja}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <TagIcon className="h-3.5 w-3.5 text-gray-400" />
                  {t.tags} <span className="text-xs text-gray-400 font-normal">（{t.optional}・複数選択可）</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                        selectedTagIds.includes(tag.id)
                          ? "bg-gray-900 text-white border-gray-900"
                          : "border-gray-200 text-gray-600 hover:border-gray-400"
                      )}
                    >
                      {lang === "zh" ? (tag.labelEn ?? tag.labelJa) : tag.labelJa}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {t.notes} <span className="text-xs text-gray-400 font-normal">（{t.optional}）</span>
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={lang === "zh" ? "拍摄现场的备注信息..." : "撮影現場のメモ・特記事項..."}
                className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-3 py-3 text-sm resize-none focus:outline-none focus:border-gray-400"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-100">
                {t.back}
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 py-3 text-sm bg-gray-900 text-white font-medium rounded-xl"
              >
                {t.next}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Upload */}
        {step === 4 && (
          <div>
            {allDone ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-gray-900 font-semibold text-lg">{t.uploadDone}</h2>
                <p className="text-gray-400 text-sm mt-2">{t.uploadDoneDesc}</p>
              </div>
            ) : (
              <>
                {/* Summary chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                    {SHOOT_METHODS.find((m) => m.value === shootMethod)?.icon}{" "}
                    {SHOOT_METHODS.find((m) => m.value === shootMethod)?.[lang]}
                  </span>
                  {selectedLocationId && locations.find((l) => l.location.id === selectedLocationId) && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                      <MapPin className="h-3 w-3" />
                      {locations.find((l) => l.location.id === selectedLocationId)!.location.name}
                    </span>
                  )}
                  {weather && (
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                      {WEATHER_OPTIONS.find((w) => w.value === weather)?.[lang]}
                    </span>
                  )}
                  {timeOfDay && (
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                      {TIME_OF_DAY_OPTIONS.find((tod) => tod.value === timeOfDay)?.[lang]}
                    </span>
                  )}
                  {selectedTagIds.length > 0 && (
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                      <TagIcon className="h-3 w-3 inline mr-0.5" />{selectedTagIds.length}件
                    </span>
                  )}
                </div>

                {/* Error message */}
                {sessionError && (
                  <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {sessionError}
                  </div>
                )}

                {/* Drop zone */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-100/50 transition-colors mb-4"
                >
                  <Upload className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">{t.dropZone}</p>
                  <p className="text-xs text-gray-400 mt-1">JPG / PNG / RAW / MP4 / MOV · 最大10GB</p>
                  <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="video/*,image/*,.raw,.cr2,.arw,.nef,.dng"
                    onChange={(e) => onDrop(Array.from(e.target.files ?? []))}
                    className="hidden"
                  />
                </div>

                {/* File list */}
                {files.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {files.map((f) => (
                      <div key={f.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
                        {f.file.type.startsWith("video/") ? (
                          <FileVideo className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <FileImage className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{f.file.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-400">{formatBytes(f.file.size)}</p>
                            <span className="text-xs text-gray-300">·</span>
                            <p className="text-xs text-gray-400">
                              {inferAssetType(shootMethod, f.file.type)}
                            </p>
                          </div>
                          {f.status === "uploading" && (
                            <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full w-1/2 animate-pulse" />
                            </div>
                          )}
                          {f.status === "error" && f.error && (
                            <p className="text-xs text-red-400 mt-0.5">{f.error}</p>
                          )}
                        </div>
                        {f.status === "pending" && (
                          <button onClick={() => removeFile(f.id)} className="text-gray-300 hover:text-gray-600">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {f.status === "uploading" && <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin flex-shrink-0" />}
                        {f.status === "done" && <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />}
                        {f.status === "error" && <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 px-1">
                      {t.total}: {files.length} {lang === "zh" ? "个文件" : "ファイル"} / {formatBytes(totalSize)}
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(3)}
                    disabled={isUploading}
                    className="px-5 py-3 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-40"
                  >
                    {t.back}
                  </button>
                  <button
                    onClick={startUpload}
                    disabled={files.length === 0 || isUploading}
                    className="flex-1 bg-gray-900 text-white font-medium py-3 rounded-xl text-sm disabled:opacity-40"
                  >
                    {isUploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t.uploading}
                      </span>
                    ) : t.startUpload}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-100">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value}</span>
    </div>
  );
}
