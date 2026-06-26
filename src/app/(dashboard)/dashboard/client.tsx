"use client";

import { AlertTriangle, CheckCircle, Clock, Upload, Package, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useLang } from "@/lib/i18n/context";

type Props = {
  data: {
    pendingReview: number;
    processingFailed: number;
    expiryData: Record<string, number>;
    todayUploads: number;
    pendingDelivery: number;
    recentAudit: { id: string; action: string; createdAt: Date; user: { name: string } | null }[];
  };
};

export function DashboardClient({ data }: Props) {
  const { tr } = useLang();

  const stats = [
    { label: tr.pendingReview, value: data.pendingReview, icon: Clock, color: "text-yellow-500", bg: "bg-yellow-50" },
    { label: tr.processingError, value: data.processingFailed, icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
    { label: tr.todayUploads, value: data.todayUploads, icon: Upload, color: "text-blue-500", bg: "bg-blue-50" },
    { label: tr.pendingDelivery, value: data.pendingDelivery, icon: Package, color: "text-purple-500", bg: "bg-purple-50" },
  ];

  const expiry = data.expiryData;
  const recentAudit = data.recentAudit;

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
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            {tr.permitExpiryAlert}
          </h2>
          <div className="space-y-3">
            {(expiry.alreadyExpired ?? 0) > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-red-500">{tr.expired}</span>
                <span className="text-sm font-medium text-red-500">{expiry.alreadyExpired} {tr.items}</span>
              </div>
            )}
            {[
              { label: tr.expiringIn7, key: "expiringIn7Days" },
              { label: tr.expiringIn14, key: "expiringIn14Days" },
              { label: tr.expiringIn30, key: "expiringIn30Days" },
            ].map(({ label, key }) => (
              <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm font-medium text-gray-900">{expiry[key] ?? 0} {tr.items}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            {tr.recentActivity}
          </h2>
          <div className="space-y-2">
            {recentAudit.length === 0 ? (
              <p className="text-sm text-gray-400">{tr.noActivity}</p>
            ) : (
              recentAudit.map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0">
                  <div>
                    <span className="text-xs text-gray-600">{log.user?.name ?? tr.system}</span>
                    <span className="text-xs text-gray-300 mx-1.5">·</span>
                    <span className="text-xs text-gray-400">{log.action}</span>
                  </div>
                  <span className="text-xs text-gray-300 whitespace-nowrap">{formatDate(log.createdAt as unknown as string)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
