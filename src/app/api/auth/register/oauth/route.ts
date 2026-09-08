import { z } from "zod";
import type { RegisterDraft } from "@/lib/register-mock";
import { ensureBackendEnabled } from "@/server/api/guard";
import { getClerkStudentContext, getRequestUser, jsonError, jsonOk } from "@/server/auth/session";
import { completeOAuthStudentRegistration } from "@/server/repositories/auth";
import { invalidateClerkProfileCache } from "@/server/lib/clerk-profile-cache";
import { isClerkEnabled } from "@/server/env";

const oauthRegisterSchema = z.object({
  draft: z.custom<RegisterDraft>(),
});

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  if (isClerkEnabled()) {
    const clerkStudent = await getClerkStudentContext(request);
    if (!clerkStudent?.email) {
      return jsonError("Unauthorized", 401);
    }

    try {
      const { draft } = oauthRegisterSchema.parse(await request.json());
      const result = await completeOAuthStudentRegistration(
        clerkStudent.profile?.id ?? clerkStudent.clerkUserId,
        clerkStudent.email,
        draft,
        { clerkUserId: clerkStudent.clerkUserId },
      );
      invalidateClerkProfileCache(clerkStudent.clerkUserId);
      return jsonOk(result, 201);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Registracija nije uspela.", 400);
    }
  }

  const user = await getRequestUser();
  if (!user?.email) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const { draft } = oauthRegisterSchema.parse(await request.json());
    const result = await completeOAuthStudentRegistration(user.id, user.email, draft);
    return jsonOk(result, 201);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Registracija nije uspela.", 400);
  }
}
