"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Shield, Plus, ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { CreateLocationModal } from "@/components/locations/create-location-modal";
import { CreatePermitModal } from "@/components/permits/create-permit-modal";

export default function ShootDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showAddPermit, setShowAddPermit] = useState(false);
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const qc = useQueryClient();

  const { data: shootData } = useQuery({
    queryKey: ["shoot", id],
    queryFn: () => fetch(`/api/shoots/${id}`).then((r) => r.json()),
  });
  const shoot = shootData?.data ?? shootData;

  const { data: locData } = useQuery({
    queryKey: ["shoot-locations", id],
    queryFn: () => fetch(`/api/shoots/${id}/locations`).then((r) => r.json()),
  });
  const shootLocations = locData?.data ?? [];

  const { data: permitData } = useQuery({
    queryKey: ["shoot-permits", id],
    queryFn: () => fetch(`/api/shoots/${id}/permits`).then((r) => r.json()),
  });
  const permits = permitData?.data ?? [];

  const { data: allLocData } = useQuery({
    queryKey: ["locations"],
    queryFn: () => fetch("/api/locations").then((r) => r.json()),
    enabled: showAddLocation,
  });
  const allLocations = allLocData?.data ?? [];

  const addExistingLocation = async (locationId: string) => {
    await fetch(`/api/shoots/${id}/locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId }),
    });
    await qc.invalidateQueries({ queryKey: ["shoot-locations", id] });
    setShowAddLocation(false);
  };

  const existingLocationIds = new Set(shootLocations.map((sl: Record<string, unknown>) => (sl.location as Record<string, unknown>)?.id));

  if (!shoot) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-gray-400 border-t-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-gray-200 flex items-center gap-4">
        <Link href="/shoots" className="text-gray-400 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{String(shoot.name ?? "")}</h1>
          <p className="text-gray-400 text-xs mt-0.5">
            {String((shoot.project as Record<string, unknown>)?.name ?? "")} · {formatDate(shoot.shootDate as string)}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* 撮影場所 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <h2 className="text-gray-900 font-medium">撮影場所</h2>
              <span className="text-gray-300 text-sm">（{shootLocations.length}件）</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCreateLocation(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100">
                <Plus className="h-3 w-3" /> 新しい場所を作成
              </button>
              <button onClick={() => setShowAddLocation(!showAddLocation)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-50">
                <Plus className="h-3 w-3" /> 既存の場所を追加
              </button>
            </div>
          </div>

          {showAddLocation && (
            <div className="mb-4 bg-white border border-gray-300 rounded-xl p-4">
              <p className="text-gray-500 text-xs mb-3">場所を選択してください</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {allLocations
                  .filter((l: Record<string, unknown>) => !existingLocationIds.has(String(l.id)))
                  .map((loc: Record<string, unknown>) => (
                    <button
                      key={String(loc.id)}
                      onClick={() => addExistingLocation(String(loc.id))}
                      className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      {String(loc.name)}
                      {loc.address != null && <span className="text-gray-400 ml-2 text-xs">{String(loc.address)}</span>}
                    </button>
                  ))}
                {allLocations.filter((l: Record<string, unknown>) => !existingLocationIds.has(String(l.id))).length === 0 && (
                  <p className="text-gray-400 text-sm px-3">追加できる場所がありません</p>
                )}
              </div>
            </div>
          )}

          {shootLocations.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
              <MapPin className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">撮影場所が登録されていません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {shootLocations.map((sl: Record<string, unknown>) => {
                const loc = sl.location as Record<string, unknown>;
                return (
                  <div key={String(sl.id)} className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl">
                    <div>
                      <p className="text-gray-900 text-sm font-medium">{String(loc?.name ?? "")}</p>
                      {loc?.address != null && <p className="text-gray-400 text-xs mt-0.5">{String(loc.address)}</p>}
                    </div>
                    <span className="text-gray-300 text-xs">{String(loc?.locationType ?? "OTHER")}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 許可情報 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-500" />
              <h2 className="text-gray-900 font-medium">許可情報</h2>
              <span className="text-gray-300 text-sm">（{permits.length}件）</span>
            </div>
            <button onClick={() => setShowAddPermit(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-50">
              <Plus className="h-3 w-3" /> 許可情報を追加
            </button>
          </div>

          {permits.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
              <Shield className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">許可情報が登録されていません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {permits.map((p: Record<string, unknown>) => (
                <div key={String(p.id)} className="px-4 py-3 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-gray-900 text-sm font-medium">{String(p.permissionType ?? "FILMING")}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      p.status === "APPROVED" ? "bg-green-900/40 text-green-400" :
                      p.status === "PENDING" ? "bg-yellow-900/40 text-yellow-400" :
                      "bg-gray-100 text-gray-400"
                    }`}>{String(p.status)}</span>
                  </div>
                  {p.authorityOrganization != null && <p className="text-gray-500 text-xs">{String(p.authorityOrganization)}</p>}
                  {p.validUntil != null && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                      <Calendar className="h-3 w-3" />
                      <span>期限: {formatDate(p.validUntil as string)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showCreateLocation && (
        <CreateLocationModal
          onClose={() => setShowCreateLocation(false)}
          onCreated={(loc) => {
            addExistingLocation(String(loc.id));
          }}
        />
      )}

      {showAddPermit && (
        <CreatePermitModal
          shootId={id}
          shootLocations={shootLocations}
          onClose={() => setShowAddPermit(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["shoot-permits", id] })}
        />
      )}
    </div>
  );
}
