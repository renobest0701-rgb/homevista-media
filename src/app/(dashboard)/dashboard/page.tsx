"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Clock, Upload, Package, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useLang } from "@/lib/i18n/context";

export default function DashboardPage() {
  const { tr } = useLang();

  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then((r) => r.json()),
  });

  const stats = [
    { label: tr.pendingReview, value: data?.pendingReview ?? 0, icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { label: tr.processingError, value: data?.processingFailed ?? 0, icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10" },
    { label: tr.todayUploads, value: data?.todayUploads ?? 0, icon: Upload, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: tr.pendingDelivery, value: data?.pendingDelivery ?? 0, icon: Package, color: "text-purple-400", bg: "bg-purple-400/10" },
  ];

  const expiry = data?.expiryData ?? {};
  const recentAudit = data?.recentAudit ?? [];

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">{tr.dashboardTitle}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            {tr.permitExpiryAlert}
          </h2>
          <div className="space-y-3">
            {expiry.alreadyExpired > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm text-red-400">{tr.expired}</span>
                <span className="text-sm font-medium text-red-400">{expiry.alreadyExpired} {tr.items}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-500">{tr.expiringIn7}</span>
              <span className="text-sm font-medium text-gray-900">{expiry.expiringIn7Days ?? 0} {tr.items}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-500">{tr.expiringIn14}</span>
              <span className="text-sm font-medium text-gray-900">{expiry.expiringIn14Days ?? 0} {tr.items}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500">{tr.expiringIn30}</span>
              <span className="text-sm font-medium text-gray-900">{expiry.expiringIn30Days ?? 0} {tr.items}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            {tr.recentActivity}
          </h2>
          <div className="space-y-2">
            {recentAudit.length === 0 ? (
              <p className="text-sm text-gray-400">{tr.noActivity}</p>
            ) : (
              recentAudit.map((log: Record<string, unknown>) => (
                <div key={String(log.id)} className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-200 last:border-0">
                  <div>
                    <span className="text-xs text-gray-600">{String((log.user as Record<string, unknown>)?.name ?? tr.system)}</span>
                    <span className="text-xs text-gray-400 mx-1.5">·</span>
                    <span className="text-xs text-gray-400">{String(log.action)}</span>
                  </div>
                  <span className="text-xs text-gray-300 whitespace-nowrap">{formatDate(log.createdAt as string)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
