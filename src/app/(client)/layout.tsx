import { requireSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession().catch(() => null);
  if (!session) redirect("/login");

  const isClient =
    session.role === "CLIENT_ADMIN" || session.role === "CLIENT_USER";
  if (!isClient) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Client portal minimal header */}
      <header className="border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 font-bold text-sm">HOMEVISTA</h1>
          <p className="text-gray-400 text-xs">デベロッパーポータル</p>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="text-xs text-gray-400 hover:text-gray-900 transition-colors">
            ログアウト
          </button>
        </form>
      </header>
      <main>{children}</main>
    </div>
  );
}
