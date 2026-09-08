import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { getNoticeReadCountDb, markNoticeReadDb } from "@/server/repositories/admin";

const markReadSchema = z.object({
  noticeId: z.string().min(1),
});

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["admin", "referent", "kitchen", "student"]);
  if ("error" in auth) return auth.error;

  try {
    const body = markReadSchema.parse(await request.json());
    if (!("profile" in auth)) return jsonError("Unauthorized", 401);
    await markNoticeReadDb(body.noticeId, auth.profile.id);
    return jsonOk({ marked: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid input", 400);
    }
    return jsonError(error instanceof Error ? error.message : "Failed to mark notice as read", 400);
  }
}

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const noticeId = searchParams.get("noticeId");
  if (!noticeId) {
    return jsonError("Missing noticeId", 400);
  }

  try {
    const count = await getNoticeReadCountDb(noticeId);
    return jsonOk({ count });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Brojač nije dostupan.", 500);
  }
}
