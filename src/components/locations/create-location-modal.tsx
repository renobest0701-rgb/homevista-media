"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const schema = z.object({
  name: z.string().min(1, "場所名は必須です"),
  officialName: z.string().optional(),
  locationType: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const LOCATION_TYPES = [
  { code: "BUILDING", ja: "建物", zh: "建筑" },
  { code: "OUTDOOR", ja: "屋外", zh: "户外" },
  { code: "INDOOR", ja: "室内", zh: "室内" },
  { code: "ROOFTOP", ja: "屋上", zh: "屋顶" },
  { code: "WATERFRONT", ja: "水辺", zh: "水边" },
  { code: "AERIAL", ja: "空撮エリア", zh: "航拍区域" },
  { code: "OTHER", ja: "その他", zh: "其他" },
];

export function CreateLocationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: (location: Record<string, unknown>) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const qc = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "エラー");
      const created = await res.json();
      await qc.invalidateQueries({ queryKey: ["locations"] });
      onCreated?.(created);
      onClose();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-300 rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-gray-900 font-semibold">撮影場所を追加</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">場所名 <span className="text-red-400">*</span></label>
            <input {...register("name")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none" placeholder="例：Aタワー エントランス" />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">正式名称</label>
            <input {...register("officialName")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">種別</label>
            <select {...register("locationType")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none">
              <option value="">選択</option>
              {LOCATION_TYPES.map((t) => <option key={t.code} value={t.code}>{t.ja}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">住所・場所の説明</label>
            <input {...register("address")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">メモ</label>
            <textarea {...register("notes")} rows={2} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none resize-none" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-100">キャンセル</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 text-sm bg-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-40">
              {isSubmitting ? "作成中..." : "場所を作成"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
