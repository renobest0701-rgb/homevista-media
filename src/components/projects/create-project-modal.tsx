"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n/context";

const schema = z.object({
  name: z.string().min(1),
  propertyName: z.string().optional(),
  propertyType: z.string().optional(),
  prefectureCode: z.string().optional(),
  municipalityCode: z.string().optional(),
  address: z.string().optional(),
  defaultVisibility: z.enum(["INTERNAL", "CLIENT_ONLY", "PUBLIC"]),
});

type FormData = z.infer<typeof schema>;

const PREFECTURES = [
  { code: "hokkaido", ja: "北海道", zh: "北海道" }, { code: "aomori", ja: "青森", zh: "青森" },
  { code: "iwate", ja: "岩手", zh: "岩手" }, { code: "miyagi", ja: "宮城", zh: "宫城" },
  { code: "akita", ja: "秋田", zh: "秋田" }, { code: "yamagata", ja: "山形", zh: "山形" },
  { code: "fukushima", ja: "福島", zh: "福岛" }, { code: "ibaraki", ja: "茨城", zh: "茨城" },
  { code: "tochigi", ja: "栃木", zh: "枥木" }, { code: "gunma", ja: "群馬", zh: "群马" },
  { code: "saitama", ja: "埼玉", zh: "埼玉" }, { code: "chiba", ja: "千葉", zh: "千叶" },
  { code: "tokyo", ja: "東京", zh: "东京" }, { code: "kanagawa", ja: "神奈川", zh: "神奈川" },
  { code: "niigata", ja: "新潟", zh: "新泻" }, { code: "toyama", ja: "富山", zh: "富山" },
  { code: "ishikawa", ja: "石川", zh: "石川" }, { code: "fukui", ja: "福井", zh: "福井" },
  { code: "yamanashi", ja: "山梨", zh: "山梨" }, { code: "nagano", ja: "長野", zh: "长野" },
  { code: "gifu", ja: "岐阜", zh: "岐阜" }, { code: "shizuoka", ja: "静岡", zh: "静冈" },
  { code: "aichi", ja: "愛知", zh: "爱知" }, { code: "mie", ja: "三重", zh: "三重" },
  { code: "shiga", ja: "滋賀", zh: "滋贺" }, { code: "kyoto", ja: "京都", zh: "京都" },
  { code: "osaka", ja: "大阪", zh: "大阪" }, { code: "hyogo", ja: "兵庫", zh: "兵库" },
  { code: "nara", ja: "奈良", zh: "奈良" }, { code: "wakayama", ja: "和歌山", zh: "和歌山" },
  { code: "tottori", ja: "鳥取", zh: "鸟取" }, { code: "shimane", ja: "島根", zh: "岛根" },
  { code: "okayama", ja: "岡山", zh: "冈山" }, { code: "hiroshima", ja: "広島", zh: "广岛" },
  { code: "yamaguchi", ja: "山口", zh: "山口" }, { code: "tokushima", ja: "徳島", zh: "德岛" },
  { code: "kagawa", ja: "香川", zh: "香川" }, { code: "ehime", ja: "愛媛", zh: "爱媛" },
  { code: "kochi", ja: "高知", zh: "高知" }, { code: "fukuoka", ja: "福岡", zh: "福冈" },
  { code: "saga", ja: "佐賀", zh: "佐贺" }, { code: "nagasaki", ja: "長崎", zh: "长崎" },
  { code: "kumamoto", ja: "熊本", zh: "熊本" }, { code: "oita", ja: "大分", zh: "大分" },
  { code: "miyazaki", ja: "宮崎", zh: "宫崎" }, { code: "kagoshima", ja: "鹿児島", zh: "鹿儿岛" },
  { code: "okinawa", ja: "沖縄", zh: "冲绳" },
];

export function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const qc = useQueryClient();
  const { tr, lang } = useLang();

  const PROPERTY_TYPES = [
    { code: "prop-condo", label: tr.condo },
    { code: "prop-house", label: tr.house },
    { code: "prop-office", label: tr.office },
    { code: "prop-commercial", label: tr.commercial },
    { code: "prop-resort", label: tr.resort },
  ];

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { defaultVisibility: "INTERNAL" },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? tr.errorOccurred);
      }
      await qc.invalidateQueries({ queryKey: ["projects"] });
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
          <h2 className="text-gray-900 font-semibold">{tr.newProject}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">{tr.projectName} <span className="text-red-400">*</span></label>
            <input {...register("name")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-zinc-500" />
            {errors.name && <p className="text-red-400 text-xs mt-1">{tr.projectName}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">{tr.propertyName}</label>
            <input {...register("propertyName")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-zinc-500" />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">{tr.propertyType}</label>
            <select {...register("propertyType")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none">
              <option value="">{tr.select}</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t.code} value={t.code}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-500 mb-1">{tr.prefecture}</label>
              <select {...register("prefectureCode")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none">
                <option value="">{tr.selectPref}</option>
                {PREFECTURES.map((p) => (
                  <option key={p.code} value={p.code}>{lang === "zh" ? p.zh : p.ja}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">{tr.municipality}</label>
              <input {...register("municipalityCode")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-zinc-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">{tr.address}</label>
            <input {...register("address")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-zinc-500" />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">{tr.defaultVisibility}</label>
            <select {...register("defaultVisibility")} className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none">
              <option value="INTERNAL">{tr.internal}</option>
              <option value="CLIENT_ONLY">{tr.clientOnly}</option>
              <option value="PUBLIC">{tr.public}</option>
            </select>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-100">
              {tr.cancel}
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 text-sm bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40">
              {isSubmitting ? tr.creating : tr.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
