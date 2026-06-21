"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2, X, FileVideo, FileImage, Plus, MapPin } from "lucide-react";
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

type Step = 1 | 2 | 3 | 4;

// Language strings (ja/zh-CN)
const T = {
  ja: {
    step1: "案件確認",
    step2: "撮影場所",
    step3: "共通情報",
    step4: "アップロード",
    project: "プロジェクト",
    shoot: "撮影案件",
    date: "撮影日",
    team: "撮影チーム",
    location: "撮影場所を選択",
    category: "撮影カテゴリー",
    peoplePresent: "人物が映っていますか？",
    yes: "はい",
    no: "いいえ",
    next: "次へ",
    back: "戻る",
    startUpload: "アップロード開始",
    dropZone: "動画・静止画をドラッグ＆ドロップ、またはクリックして選択",
    total: "合計",
    uploading: "アップロード中...",
    done: "完了",
    error: "エラー",
    uploadDone: "アップロード完了",
    uploadDoneDesc: "素材は管理者の確認後に公開されます",
  },
  zh: {
    step1: "确认任务",
    step2: "拍摄地点",
    step3: "公共信息",
    step4: "上传",
    project: "项目",
    shoot: "拍摄任务",
    date: "拍摄日期",
    team: "摄影团队",
    location: "选择拍摄地点",
    category: "拍摄类别",
    peoplePresent: "画面中是否有人物？",
    yes: "是",
    no: "否",
    next: "下一步",
    back: "返回",
    startUpload: "开始上传",
    dropZone: "将视频/图片拖放到此处，或点击选择文件",
    total: "总计",
    uploading: "上传中...",
    done: "完成",
    error: "错误",
    uploadDone: "上传完成",
    uploadDoneDesc: "素材经管理员审核后发布",
  },
};

export function UploadWizard({ shoot }: { shoot: Shoot }) {
  const [lang, setLang] = useState<"ja" | "zh">("ja");
  const t = T[lang];
  const [step, setStep] = useState<Step>(1);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [peoplePresent, setPeoplePresent] = useState(false);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [allDone, setAllDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamic location management
  const [locations, setLocations] = useState<ShootLocation[]>(shoot.locations);
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationType, setNewLocationType] = useState("BUILDING");
  const [addingLocation, setAddingLocation] = useState(false);

  const addNewLocation = async () => {
    if (!newLocationName.trim()) return;
    setAddingLocation(true);
    try {
      // Create location
      const locRes = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLocationName.trim(), locationType: newLocationType }),
      });
      if (!locRes.ok) return;
      const newLoc = await locRes.json();

      // Link to shoot
      const linkRes = await fetch(`/api/shoots/${shoot.id}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: newLoc.id }),
      });
      if (!linkRes.ok) return;
      const shootLoc = await linkRes.json();

      setLocations((prev) => [...prev, { id: shootLoc.id, location: { id: newLoc.id, name: newLoc.name, locationType: newLoc.locationType } }]);
      setSelectedLocationId(newLoc.id);
      setNewLocationName("");
      setShowNewLocation(false);
    } finally {
      setAddingLocation(false);
    }
  };

  const shootDateStr = new Date(shoot.shootDate).toLocaleDateString(lang === "zh" ? "zh-CN" : "ja-JP");

  const onDrop = useCallback(
    (newFiles: File[]) => {
      const uploads: UploadFile[] = newFiles.map((f) => ({
        id: Math.random().toString(36).slice(2),
        file: f,
        status: "pending",
        progress: 0,
      }));
      setFiles((prev) => [...prev, ...uploads]);
    },
    []
  );

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop(Array.from(e.dataTransfer.files));
  };

  const removeFile = (id: string) =>
    setFiles((prev) => prev.filter((f) => f.id !== id));

  const startUpload = async () => {
    if (files.length === 0) return;
    setStep(4);

    // Create upload session
    const sessionRes = await fetch("/api/uploads/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shootId: shoot.id,
        shootLocationId: selectedLocationId || undefined,
        files: files.map((f) => ({
          originalFileName: f.file.name,
          mimeType: f.file.type,
          sizeBytes: f.file.size,
          fileRole: "ORIGINAL",
        })),
        assetType: files[0]?.file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
        peoplePresent,
        notes,
      }),
    });

    const session = await sessionRes.json();
    if (!sessionRes.ok) return;

    const completedIds: string[] = [];
    const failedIds: string[] = [];

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const fileInfo = session.files[i];
      const uploadFile = files[i];
      if (!fileInfo) continue;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: "uploading" } : f
        )
      );

      try {
        if (fileInfo.fields) {
          // OSS POST form upload
          const formData = new FormData();
          Object.entries(fileInfo.fields as Record<string, string>).forEach(
            ([k, v]) => formData.append(k, v)
          );
          formData.append("file", uploadFile.file);

          const res = await fetch(fileInfo.uploadUrl, {
            method: "POST",
            body: formData,
          });

          if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        } else {
          // Local API upload
          const res = await fetch(fileInfo.uploadUrl, {
            method: "PUT",
            body: uploadFile.file,
            headers: { "Content-Type": uploadFile.file.type },
          });
          if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        }

        completedIds.push(fileInfo.assetFileId);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "done", progress: 100 } : f
          )
        );
      } catch (err) {
        failedIds.push(fileInfo.assetFileId);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: "error", error: String(err) }
              : f
          )
        );
      }
    }

    // Complete session
    await fetch(`/api/uploads/${session.sessionId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedFileIds: completedIds, failedFileIds: failedIds }),
    });

    if (failedIds.length === 0) setAllDone(true);
  };

  const totalSize = files.reduce((s, f) => s + f.file.size, 0);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-sm tracking-tight">HOMEVISTA Upload</h1>
        </div>
        {/* Lang toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setLang("ja")}
            className={cn("px-3 py-1 text-xs rounded-md transition-colors", lang === "ja" ? "bg-gray-200 text-gray-900" : "text-gray-500")}
          >
            日本語
          </button>
          <button
            onClick={() => setLang("zh")}
            className={cn("px-3 py-1 text-xs rounded-md transition-colors", lang === "zh" ? "bg-gray-200 text-gray-900" : "text-gray-500")}
          >
            中文
          </button>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex border-b border-gray-200">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div
            key={s}
            className={cn(
              "flex-1 text-center py-3 text-xs transition-colors",
              step === s
                ? "text-gray-900 border-b-2 border-white"
                : step > s
                ? "text-green-400"
                : "text-gray-300"
            )}
          >
            {s === 1 ? t.step1 : s === 2 ? t.step2 : s === 3 ? t.step3 : t.step4}
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
              className="w-full bg-gray-900 text-gray-900 font-medium py-3 rounded-xl text-sm mt-6"
            >
              {t.next}
            </button>
          </div>
        )}

        {/* STEP 2: Location */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-gray-500">{t.location}</label>
                <button
                  onClick={() => setShowNewLocation(!showNewLocation)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
                >
                  <Plus className="h-3 w-3" />
                  {lang === "zh" ? "新增地点" : "新しい場所を追加"}
                </button>
              </div>

              {locations.length > 0 ? (
                <div className="space-y-2">
                  {locations.map((sl) => (
                    <label key={sl.id} className="flex items-center gap-3 p-3 bg-white border border-gray-300 rounded-xl cursor-pointer has-[:checked]:border-white">
                      <input
                        type="radio"
                        name="location"
                        value={sl.location.id}
                        checked={selectedLocationId === sl.location.id}
                        onChange={(e) => setSelectedLocationId(e.target.value)}
                        className="accent-white"
                      />
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm">{sl.location.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm py-2">{lang === "zh" ? "尚无拍摄地点" : "撮影場所が未登録です"}</p>
              )}

              {showNewLocation && (
                <div className="mt-3 p-4 bg-white border border-gray-300 rounded-xl space-y-3">
                  <p className="text-xs text-gray-500">{lang === "zh" ? "新建拍摄地点" : "新しい撮影場所を作成"}</p>
                  <input
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder={lang === "zh" ? "地点名称" : "場所名"}
                    className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none"
                  />
                  <select
                    value={newLocationType}
                    onChange={(e) => setNewLocationType(e.target.value)}
                    className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none"
                  >
                    <option value="BUILDING">{lang === "zh" ? "建筑" : "建物"}</option>
                    <option value="OUTDOOR">{lang === "zh" ? "户外" : "屋外"}</option>
                    <option value="INDOOR">{lang === "zh" ? "室内" : "室内"}</option>
                    <option value="ROOFTOP">{lang === "zh" ? "屋顶" : "屋上"}</option>
                    <option value="WATERFRONT">{lang === "zh" ? "水边" : "水辺"}</option>
                    <option value="AERIAL">{lang === "zh" ? "航拍区域" : "空撮エリア"}</option>
                    <option value="OTHER">{lang === "zh" ? "其他" : "その他"}</option>
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => setShowNewLocation(false)} className="flex-1 py-2 text-xs text-gray-500 border border-gray-300 rounded-lg">
                      {lang === "zh" ? "取消" : "キャンセル"}
                    </button>
                    <button
                      onClick={addNewLocation}
                      disabled={!newLocationName.trim() || addingLocation}
                      className="flex-1 py-2 text-xs bg-gray-900 text-gray-900 font-medium rounded-lg disabled:opacity-40"
                    >
                      {addingLocation ? "..." : (lang === "zh" ? "创建并选择" : "作成して選択")}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-2">{t.category}</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-3 py-3 text-sm focus:outline-none"
              >
                <option value="">選択してください</option>
                <option value="cat-exterior">物件外観 / 物业外观</option>
                <option value="cat-interior">物件内観 / 物业内部</option>
                <option value="cat-view">眺望 / 景观</option>
                <option value="cat-street">街並み / 街景</option>
                <option value="cat-nature">自然 / 自然</option>
                <option value="cat-sea">海 / 海</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 text-sm text-gray-500 border border-gray-300 rounded-xl">{t.back}</button>
              <button onClick={() => setStep(3)} className="flex-1 py-3 text-sm bg-gray-900 text-gray-900 font-medium rounded-xl">{t.next}</button>
            </div>
          </div>
        )}

        {/* STEP 3: Common settings */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm text-gray-500 mb-3">{t.peoplePresent}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPeoplePresent(true)}
                  className={cn("flex-1 py-3 text-sm rounded-xl border transition-colors",
                    peoplePresent ? "bg-gray-900 text-gray-900 border-white" : "border-gray-300 text-gray-600")}
                >
                  {t.yes}
                </button>
                <button
                  onClick={() => setPeoplePresent(false)}
                  className={cn("flex-1 py-3 text-sm rounded-xl border transition-colors",
                    !peoplePresent ? "bg-gray-900 text-gray-900 border-white" : "border-gray-300 text-gray-600")}
                >
                  {t.no}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-2">補足メモ / 备注</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-white border border-gray-300 text-gray-900 rounded-xl px-3 py-3 text-sm resize-none focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 text-sm text-gray-500 border border-gray-300 rounded-xl">{t.back}</button>
              <button onClick={() => setStep(4)} className="flex-1 py-3 text-sm bg-gray-900 text-gray-900 font-medium rounded-xl">{t.next}</button>
            </div>
          </div>
        )}

        {/* STEP 4: Upload */}
        {step === 4 && (
          <div>
            {allDone ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h2 className="text-gray-900 font-semibold text-lg">{t.uploadDone}</h2>
                <p className="text-gray-400 text-sm mt-2">{t.uploadDoneDesc}</p>
              </div>
            ) : (
              <>
                {/* Drop zone */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-zinc-500 transition-colors mb-4"
                >
                  <Upload className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">{t.dropZone}</p>
                  <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="video/*,image/*"
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
                          <FileVideo className="h-4 w-4 text-gray-400 shrink-0" />
                        ) : (
                          <FileImage className="h-4 w-4 text-gray-400 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">{f.file.name}</p>
                          <p className="text-xs text-gray-400">{formatBytes(f.file.size)}</p>
                          {f.status === "uploading" && (
                            <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full w-1/2 animate-pulse" />
                            </div>
                          )}
                        </div>
                        {f.status === "pending" && (
                          <button onClick={() => removeFile(f.id)} className="text-gray-300 hover:text-gray-600">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {f.status === "uploading" && <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />}
                        {f.status === "done" && <CheckCircle className="h-3.5 w-3.5 text-green-400" />}
                        {f.status === "error" && <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
                      </div>
                    ))}
                    <p className="text-xs text-gray-400 px-1">
                      {t.total}: {files.length} ファイル / {formatBytes(totalSize)}
                    </p>
                  </div>
                )}

                <button
                  onClick={startUpload}
                  disabled={files.length === 0 || files.some((f) => f.status === "uploading")}
                  className="w-full bg-gray-900 text-gray-900 font-medium py-3 rounded-xl text-sm disabled:opacity-40"
                >
                  {files.some((f) => f.status === "uploading") ? t.uploading : t.startUpload}
                </button>
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
    <div className="flex justify-between items-center py-2.5 border-b border-gray-200">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value}</span>
    </div>
  );
}
