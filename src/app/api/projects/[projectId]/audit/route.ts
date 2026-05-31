import { jsonError, jsonSuccess } from "@/lib/api-response";
import { auth } from "@/lib/auth";
import { listProjectAuditLogsWithUser } from "@/lib/db/read-queries";
import { canAccess, getProjectAccessRole } from "@/lib/project-access";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

const QuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  action: z.string().optional(),
});

export async function GET(request: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return jsonError("UNAUTHORIZED", "Sign in required.", 401);
  }
  const { projectId } = await ctx.params;
  const role = await getProjectAccessRole(session.user.id, projectId);
  if (!role || !canAccess(role, "viewer")) {
    return jsonError("NOT_FOUND", "Project not found.", 404);
  }

  // Parse query params (searchParams.get returns null when absent; Zod optional rejects null)
  const url = new URL(request.url);
  const actionParam = url.searchParams.get("action");
  const queryResult = QuerySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
    action: actionParam && actionParam.length > 0 ? actionParam : undefined,
  });

  if (!queryResult.success) {
    return jsonError(
      "VALIDATION_ERROR",
      queryResult.error.issues.map((i) => i.message).join(" "),
      400,
    );
  }

  const { limit, offset, action } = queryResult.data;

  const result = await listProjectAuditLogsWithUser({
    projectId,
    limit,
    offset,
    action,
  });

  return jsonSuccess(result);
}
