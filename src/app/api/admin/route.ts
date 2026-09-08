import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { getStudentRequestUser, jsonError, jsonOk, requireRole } from "@/server/auth/session";
import {
  fetchAdminSystemState,
  fetchPublicAdminSystemState,
  saveAdminConfigPartial,
  submitFeedbackDb,
} from "@/server/repositories/admin";

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const scope = new URL(request.url).searchParams.get("scope");
  if (scope === "full") {
    const auth = await requireRole(["admin"]);
    if ("error" in auth) return auth.error;
  }

  const state =
    scope === "full" ? await fetchAdminSystemState() : await fetchPublicAdminSystemState();
  return jsonOk(state);
}

const patchSchema = z.object({
  partial: z.record(z.string(), z.unknown()),
});

export async function PATCH(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const auth = await requireRole(["admin"]);
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const body = patchSchema.parse(await request.json());
    const state = await saveAdminConfigPartial(body.partial as never);
    return jsonOk(state);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Update failed", 400);
  }
}

const feedbackSchema = z.object({
  name: z.string(),
  message: z.string().min(3),
  rating: z.number().int().min(1).max(5),
  anonymous: z.boolean().optional(),
  initials: z.string().optional(),
});

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const student = await getStudentRequestUser(request);
  const body = feedbackSchema.parse(await request.json());

  const entry = await submitFeedbackDb({
    profileId: student?.id,
    ...body,
  });

  const state = await fetchAdminSystemState();
  return jsonOk({ entry, state }, 201);
}
