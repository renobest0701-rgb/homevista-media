"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Camera,
  Library,
  CheckSquare,
  Package,
  Globe,
  Settings,
  Users,
  Tag,
  Shield,
  BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n/context";

export function Sidebar() {
  const pathname = usePathname();
  const { tr, lang, setLang } = useLang();

  const navItems = [
    { href: "/dashboard", label: tr.dashboard, icon: LayoutDashboard },
    { href: "/projects", label: tr.projects, icon: FolderOpen },
    { href: "/shoots", label: tr.shoots, icon: Camera },
    { href: "/assets", label: tr.assetLibrary, icon: Library },
    { href: "/review", label: tr.review, icon: CheckSquare },
    { href: "/delivery", label: tr.delivery, icon: Package },
    { href: "/publications", label: tr.publications, icon: Globe },
  ];

  const adminItems = [
    { href: "/admin/users", label: tr.users, icon: Users },
    { href: "/admin/tags", label: tr.tags, icon: Tag },
    { href: "/admin/permissions", label: tr.permissions, icon: Shield },
    { href: "/admin/audit", label: tr.audit, icon: BarChart2 },
    { href: "/admin/settings", label: tr.settings, icon: Settings },
  ];

  return (
    <aside className="w-60 flex-shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-zinc-800">
        <span className="text-white font-bold tracking-tight text-sm">
          HOMEVISTA
        </span>
        <span className="block text-zinc-500 text-xs mt-0.5">
          Media Asset Platform
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        ))}

        <div className="pt-4 pb-1">
          <p className="px-3 text-xs text-zinc-600 font-medium uppercase tracking-wider">
            {tr.management}
          </p>
        </div>

        {adminItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Language toggle + version */}
      <div className="px-4 py-4 border-t border-zinc-800 flex items-center justify-between">
        <p className="text-xs text-zinc-500">v1.1.0</p>
        <div className="flex gap-1">
          <button
            onClick={() => setLang("ja")}
            className={cn(
              "px-2 py-1 text-xs rounded font-medium transition-colors",
              lang === "ja"
                ? "bg-zinc-700 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            日本語
          </button>
          <button
            onClick={() => setLang("zh")}
            className={cn(
              "px-2 py-1 text-xs rounded font-medium transition-colors",
              lang === "zh"
                ? "bg-zinc-700 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            中文
          </button>
        </div>
      </div>
    </aside>
  );
}
