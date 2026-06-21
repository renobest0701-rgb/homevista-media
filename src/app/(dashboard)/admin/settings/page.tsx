"use client";
import { Settings } from "lucide-react";
export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">システム設定</h1>
      </div>
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Settings className="h-10 w-10 text-gray-200 mb-3" />
        <p className="text-gray-400 text-sm">システム設定画面（実装予定）</p>
      </div>
    </div>
  );
}
