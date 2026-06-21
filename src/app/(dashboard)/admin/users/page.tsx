"use client";
import { Users } from "lucide-react";
export default function UsersPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-8 py-5 border-b border-zinc-800">
        <h1 className="text-lg font-semibold text-white">ユーザー管理</h1>
      </div>
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Users className="h-10 w-10 text-zinc-700 mb-3" />
        <p className="text-zinc-500 text-sm">ユーザー管理画面（実装予定）</p>
      </div>
    </div>
  );
}
