"use client";
import { Shield } from "lucide-react";
export default function PermissionsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-zinc-800">
        <h1 className="text-lg font-semibold text-white">許可情報</h1>
      </div>
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Shield className="h-10 w-10 text-zinc-700 mb-3" />
        <p className="text-zinc-500 text-sm">許可情報管理画面（実装予定）</p>
      </div>
    </div>
  );
}
