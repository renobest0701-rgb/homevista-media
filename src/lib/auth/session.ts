import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/client";
import type { MemberRole } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: MemberRole;
  organizationId: string;
  supabaseId: string;
};

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) return null;

  const user = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (!user || user.status !== "ACTIVE") return null;
  const membership = user.memberships[0];
  if (!membership) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: membership.role,
    organizationId: membership.organizationId,
    supabaseId: supabaseUser.id,
  };
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
