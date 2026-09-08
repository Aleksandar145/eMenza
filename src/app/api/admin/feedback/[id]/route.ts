import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import {
  clearFeedbackReplyDb,
  deleteFeedbackEntryDb,
  markFeedbackReviewedDb,
  toggleFeedbackDisagreeDb,
  toggleFeedbackHelpfulDb,
} from "@/server/repositories/admin";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["admin"]);
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { id } = await params;
    await deleteFeedbackEntryDb(id);
    return jsonOk({ deleted: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Brisanje nije uspelo.", 400);
  }
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("toggle-helpful"), add: z.boolean() }),
  z.object({ action: z.literal("toggle-disagree"), add: z.boolean() }),
  z.object({ action: z.literal("mark-reviewed"), reply: z.string().optional() }),
  z.object({ action: z.literal("clear-reply") }),
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["admin"]);
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await params;

  try {
    const body = patchSchema.parse(await request.json());

    switch (body.action) {
      case "toggle-helpful":
        await toggleFeedbackHelpfulDb(id, body.add);
        break;
      case "toggle-disagree":
        await toggleFeedbackDisagreeDb(id, body.add);
        break;
      case "mark-reviewed":
        await markFeedbackReviewedDb(id, body.reply);
        break;
      case "clear-reply":
        await clearFeedbackReplyDb(id);
        break;
    }

    return jsonOk({ updated: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Operation failed", 400);
  }
}
