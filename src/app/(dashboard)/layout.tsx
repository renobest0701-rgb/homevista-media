import { Sidebar } from "@/components/layout/sidebar";
import { LangProvider } from "@/lib/i18n/context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LangProvider>
      <div className="flex h-screen overflow-hidden bg-zinc-900">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </LangProvider>
  );
}
