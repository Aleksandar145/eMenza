import { z } from "zod";
import type { RegisterDraft } from "@/lib/register-mock";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk } from "@/server/auth/session";
import { registerStudentAccount } from "@/server/repositories/auth";

const registerSchema = z.object({
  draft: z.custom<RegisterDraft>(),
  authUserId: z.string().min(1),
});

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  try {
    const { draft, authUserId } = registerSchema.parse(await request.json());
    const result = await registerStudentAccount(draft, { authUserId });
    return jsonOk(result, 201);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Registracija nije uspela.", 400);
  }
}
