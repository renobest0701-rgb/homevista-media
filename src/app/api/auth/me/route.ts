import { withAuth, apiResponse } from "@/lib/auth/api-handler";

export const GET = withAuth(async ({ user }) => {
  return apiResponse(user);
});
