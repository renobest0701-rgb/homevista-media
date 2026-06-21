"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLang } from "@/lib/i18n/context";

const schema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  shootDate: z.string().min(1),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function CreateShootModal({ onClose, defaultProjectId }: { onClose: () => void; defaultProjectId?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const qc = useQueryClient();
  const { tr } = useLang();

  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects?limit=100").then((r) => r.json()),
  });
  const projects = projectsData?.data ?? [];

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { projectId: defaultProjectId ?? "" },
  });

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
      onClose();
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold">{tr.newShoot}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">{tr.projects} <span className="text-red-400">*</span></label>
            <select {...register("projectId")} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none">
              <option value="">{tr.selectProject}</option>
              {(projects as Record<string, unknown>[]).map((p) => (
                <option key={String(p.id)} value={String(p.id)}>{String(p.name)}</option>
              ))}
            </select>
            {errors.projectId && <p className="text-red-400 text-xs mt-1">{tr.selectProject}</p>}
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">{tr.shootName} <span className="text-red-400">*</span></label>
            <input
              {...register("name")}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500"
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{tr.shootName}</p>}
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">{tr.shootDate} <span className="text-red-400">*</span></label>
            <input
              {...register("shootDate")}
              type="date"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500"
            />
            {errors.shootDate && <p className="text-red-400 text-xs mt-1">{tr.shootDate}</p>}
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">{tr.notes}</label>
            <textarea
              {...register("notes")}
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-500 resize-none"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm text-zinc-400 border border-zinc-700 rounded-lg hover:bg-zinc-800">
              {tr.cancel}
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 text-sm bg-white text-black font-medium rounded-lg hover:bg-zinc-100 disabled:opacity-40">
              {isSubmitting ? tr.creating : tr.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
