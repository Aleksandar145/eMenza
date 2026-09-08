import { ensureBackendEnabled } from "@/server/api/guard";
import { getStudentRequestUser, jsonError, jsonOk } from "@/server/auth/session";
import { deleteStudentAccount } from "@/server/repositories/auth";

export async function DELETE() {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const user = await getStudentRequestUser();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  try {
    await deleteStudentAccount(user.id);
    return jsonOk({ ok: true });
  } catch (error) {
    console.error("[auth/account DELETE]", error);
    return jsonError(
      error instanceof Error ? error.message : "Brisanje naloga nije uspelo.",
      500,
    );
  }
}
