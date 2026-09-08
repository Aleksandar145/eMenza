import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { archiveNoticesDb, publishNoticeDb } from "@/server/repositories/admin";
import { appendActivityLogDb } from "@/server/repositories/activity-logs";

const noticeSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  priority: z.enum(["info", "important"]),
  targets: z.array(z.enum(["student", "referent", "admin", "kitchen"])).min(1),
  targetEmail: z.string().email().optional(),
  displayMode: z.enum(["standard", "popup"]).optional().default("standard"),
  authorName: z.string().optional(),
  authorEmail: z.string().optional(),
});

const archiveSchema = z.object({
  action: z.literal("archive"),
  ids: z.array(z.string().min(1)).min(1),
});

export async function PATCH(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  try {
    const body = archiveSchema.parse(await request.json());
    await archiveNoticesDb(body.ids);
    return jsonOk({ archived: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid input", 400);
    }
    return jsonError(error instanceof Error ? error.message : "Archive failed", 400);
  }
}

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  try {
    const body = noticeSchema.parse(await request.json());
    const session = ("session" in auth ? auth.session : null) as { displayName?: string; email?: string } | null;
    const notice = {
      id: crypto.randomUUID(),
      title: body.title.trim(),
      message: body.message.trim(),
      time: new Intl.DateTimeFormat("sr-RS", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
      priority: body.priority,
      target: body.targets,
      targetEmail: body.targetEmail,
      publishedAt: new Date().toISOString(),
      archived: false,
      displayMode: body.displayMode,
      authorName: body.authorName ?? session?.displayName ?? undefined,
      authorEmail: body.authorEmail ?? session?.email ?? undefined,
    };

    await publishNoticeDb(notice);
    await appendActivityLogDb({
      userId: "user" in auth && auth.user ? auth.user.id : undefined,
      actionType: "notice.publish",
      description: `Objavljeno obaveštenje: ${notice.title} (namena: ${body.targets.join(", ")})`,
      ipAddress: request.headers.get("x-forwarded-for"),
    });
    return jsonOk({ notice }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? "Invalid input", 400);
    }
    return jsonError(error instanceof Error ? error.message : "Failed to publish notice", 400);
  }
}
