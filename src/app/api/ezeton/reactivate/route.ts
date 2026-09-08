import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { getStudentRequestUser, jsonError, jsonOk } from "@/server/auth/session";
import { jsonStudentError } from "@/server/i18n/student-errors";
import { getZetonDepositRsd } from "@/lib/admin-system-store";
import { reactivateTokenDb } from "@/server/repositories/ezeton";

const bodySchema = z.object({
  depositRsd: z.number().nonnegative().optional(),
});

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const student = await getStudentRequestUser(request);
  if (!student) {
    return jsonStudentError(null, "unauthorized", 401);
  }

  let body;
  try {
    body = bodySchema.parse(await request.json().catch(() => ({})));
  } catch {
    return jsonError("Nevalidan zahtev.", 400);
  }
  const depositRsd = body.depositRsd ?? getZetonDepositRsd();

  try {
    const token = await reactivateTokenDb(student.id, depositRsd);
    return jsonOk({ token });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Reaktivacija nije uspela.", 400);
  }
}
