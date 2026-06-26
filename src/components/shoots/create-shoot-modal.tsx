"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Search, ChevronDown, Check } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n/context";

const schema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  shootDate: z.string().min(1),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function ProjectCombobox({
  projects,
  value,
  onChange,
  error,
}: {
  projects: { id: string; name: string; propertyName?: string | null; code: string }[];
  value: string;
  onChange: (id: string) => void;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = projects.find((p) => p.id === value);
  const filtered = projects.filter((p) => {
    const term = q.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.propertyName ?? "").toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term)
    );
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    else setQ("");
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3 py-2.5 bg-gray-100 border rounded-lg text-sm text-left focus:outline-none transition-colors ${
          error ? "border-red-300" : open ? "border-gray-400" : "border-gray-300"
        }`}
      >
        <span className={selected ? "text-gray-900" : "text-gray-400"}>
          {selected
            ? `${selected.propertyName ?? selected.name}　${selected.code}`
            : "プロジェクトを選択..."}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
            <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="名称・物件名・コードで検索..."
              className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} className="text-gray-300 hover:text-gray-500">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Options */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-gray-400">
                「{q}」に一致するプロジェクトがありません
              </p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onChange(p.id); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">
                      {p.propertyName ?? p.name}
                    </p>
                    <p className="text-xs text-gray-400">{p.code}</p>
                  </div>
                  {value === p.id && <Check className="h-4 w-4 text-green-500 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CreateShootModal({ onClose, defaultProjectId, onCreated }: { onClose: () => void; defaultProjectId?: string; onCreated?: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId ?? "");
  const qc = useQueryClient();
  const { tr } = useLang();

  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects?limit=100").then((r) => r.json()),
  });
  const projects = (projectsData?.data ?? []) as { id: string; name: string; propertyName?: string | null; code: string }[];

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { projectId: defaultProjectId ?? "" },
  });

  const handleProjectChange = (id: string) => {
    setSelectedProjectId(id);
    setValue("projectId", id, { shouldValidate: true });
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/shoots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          shootDate: new Date(data.shootDate).toISOString(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? tr.errorOccurred);
      }
      await qc.invalidateQueries({ queryKey: ["shoots"] });
      await qc.invalidateQueries({ queryKey: ["project"] });
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
      <div className="bg-white border border-gray-300 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-gray-900 font-semibold">{tr.newShoot}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">{tr.projects} <span className="text-red-400">*</span></label>
            <ProjectCombobox
              projects={projects}
              value={selectedProjectId}
              onChange={handleProjectChange}
              error={!!errors.projectId}
            />
            {errors.projectId && <p className="text-red-400 text-xs mt-1">{tr.selectProject}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">{tr.shootName} <span className="text-red-400">*</span></label>
            <input
              {...register("name")}
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-zinc-500"
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{tr.shootName}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">{tr.shootDate} <span className="text-red-400">*</span></label>
            <input
              {...register("shootDate")}
              type="date"
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-zinc-500"
            />
            {errors.shootDate && <p className="text-red-400 text-xs mt-1">{tr.shootDate}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">{tr.notes}</label>
            <textarea
              {...register("notes")}
              rows={3}
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-zinc-500 resize-none"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-100">
              {tr.cancel}
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 text-sm bg-gray-900 text-gray-900 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-40">
              {isSubmitting ? tr.creating : tr.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
