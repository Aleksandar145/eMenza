import { ensureBackendEnabled } from "@/server/api/guard";
import { getStudentRequestUser, jsonError, jsonOk } from "@/server/auth/session";
import { jsonStudentError } from "@/server/i18n/student-errors";
import { getStudentTokenDb } from "@/server/repositories/ezeton";

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const student = await getStudentRequestUser(request);
  if (!student) {
    return jsonStudentError(null, "unauthorized", 401);
  }

  const token = await getStudentTokenDb(student.id);
  return jsonOk({ token });
}
