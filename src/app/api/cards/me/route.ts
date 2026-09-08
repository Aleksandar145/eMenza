import { ensureBackendEnabled } from "@/server/api/guard";
import { getStudentRequestUser, jsonError, jsonOk } from "@/server/auth/session";
import { getStudentCardByProfileId } from "@/server/repositories/cards";

export async function GET() {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const user = await getStudentRequestUser();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const card = await getStudentCardByProfileId(user.id);
  return jsonOk({ card });
}
