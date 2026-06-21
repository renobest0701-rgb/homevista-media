"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";

const schema = z.object({
  locationId: z.string().optional(),
  permissionType: z.enum(["FILMING", "FACILITY_USE", "PORTRAIT", "MUSIC", "AERIAL", "OTHER"]),
  authorityOrganization: z.string().optional(),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(),
  permissionNumber: z.string().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  permissionConditions: z.string().optional(),
  organicSocialAllowed: z.boolean().optional(),
  paidAdvertisingAllowed: z.boolean().optional(),
  overseasUseAllowed: z.boolean().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const PERMISSION_TYPES = [
  { code: "FILMING", label: "撮影許可" },
  { code: "FACILITY_USE", label: "施設使用許可" },
  { code: "PORTRAIT", label: "肖像権許可" },
  { code: "MUSIC", label: "音楽使用許可" },
  { code: "AERIAL", label: "航空撮影許可" },
  { code: "OTHER", label: "その他" },
];

export function CreatePermitModal({
  shootId,
  shootLocations,
  onClose,
  onCreated,
}: {
  shootId: string;
  shootLocations: Record<string, unknown>[];
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { permissionType: "FILMING" },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError("");
    try {
      const payload = {
        ...data,
        validFrom: data.validFrom ? new Date(data.validFrom).toISOString() : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : undefined,
        locationId: data.locationId || undefined,
      };
      const res = await fetch(`/api/shoots/${shootId}/permits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "エラー");
      onCreated?.();
      onClose();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-300 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-gray-900 font-semibold">許可情報を登録</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">許可種別 <span className="text-red-400">*</span></label>
            <select {...register("permissionType")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none">
              {PERMISSION_TYPES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
            </select>
          </div>

          {shootLocations.length > 0 && (
            <div>
              <label className="block text-sm text-gray-500 mb-1">対象場所</label>
              <select {...register("locationId")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none">
                <option value="">全体（場所指定なし）</option>
                {shootLocations.map((sl) => {
                  const loc = sl.location as Record<string, unknown>;
                  return <option key={String(sl.id)} value={String(loc?.id)}>{String(loc?.name)}</option>;
                })}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-500 mb-1">許可機関・組織</label>
            <input {...register("authorityOrganization")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none" placeholder="例：〇〇管理組合" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-500 mb-1">担当者名</label>
              <input {...register("contactPerson")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">電話番号</label>
              <input {...register("contactPhone")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">許可番号</label>
            <input {...register("permissionNumber")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-500 mb-1">有効開始日</label>
              <input type="date" {...register("validFrom")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">有効期限</label>
              <input type="date" {...register("validUntil")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">許可条件</label>
            <textarea {...register("permissionConditions")} rows={2} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none resize-none" placeholder="利用上の制限・条件など" />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-500">利用許可範囲</p>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" {...register("organicSocialAllowed")} className="rounded" />
              SNS（オーガニック）投稿可
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" {...register("paidAdvertisingAllowed")} className="rounded" />
              広告利用可
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" {...register("overseasUseAllowed")} className="rounded" />
              海外利用可
            </label>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">メモ</label>
            <textarea {...register("notes")} rows={2} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none resize-none" />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-100">キャンセル</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 text-sm bg-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-40">
              {isSubmitting ? "登録中..." : "許可情報を登録"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
