import { NextRequest, NextResponse } from "next/server";
import { getSession, requireSession, type SessionUser } from "./session";
import type { MemberRole } from "@prisma/client";
import { hasRole } from "./rbac";

type HandlerContext = {
  user: SessionUser;
  req: NextRequest;
  params?: Record<string, string>;
};

type ApiHandler = (ctx: HandlerContext) => Promise<NextResponse | Response>;

export function withAuth(
  handler: ApiHandler,
  options?: { minimumRole?: MemberRole }
) {
  return async (
    req: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
  ) => {
    try {
      const user = await requireSession();

      if (options?.minimumRole && !hasRole(user, options.minimumRole)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const params = context?.params ? await context.params : undefined;
      return handler({ user, req, params });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "UNAUTHORIZED") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (err.message === "FORBIDDEN") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
      console.error(err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

export function apiResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
