import { z } from "zod";
import type { SettingsState } from "@/lib/podesavanja-mock";
import { ensureBackendEnabled } from "@/server/api/guard";
import { getStudentRequestUser, jsonOk } from "@/server/auth/session";
import { jsonStudentError } from "@/server/i18n/student-errors";
import { getUserSettingsDb, saveUserSettingsForProfile } from "@/server/repositories/settings";

const patchSchema = z.object({
  settings: z.custom<SettingsState>(),
});

export async function GET() {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const user = await getStudentRequestUser();
  if (!user) {
    return jsonStudentError(null, "unauthorized", 401);
  }

  const settings = await getUserSettingsDb(user.id);
  return jsonOk({ settings });
}

export async function PATCH(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const user = await getStudentRequestUser();
  if (!user) {
    return jsonStudentError(null, "unauthorized", 401);
  }

  try {
    const { settings } = patchSchema.parse(await request.json());
    const saved = await saveUserSettingsForProfile(user.id, settings);
    return jsonOk({ settings: saved });
  } catch {
    return jsonStudentError(user.id, "saveFailed", 400);
  }
}
