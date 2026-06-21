import { NextRequest, NextResponse } from "next/server";
import { checkRightsExpiry } from "@/lib/jobs/rights-expiry";

// Called by cron or manually by admin. Secured by shared secret.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkRightsExpiry();
  return NextResponse.json(result);
}
