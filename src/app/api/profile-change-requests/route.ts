import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { getStudentRequestUser, jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { jsonStudentError } from "@/server/i18n/student-errors";
import {
  createProfileChangeRequestDb,
  listPendingProfileChangeRequestsDb,
  getPendingRequestByCardNumberDb,
} from "@/server/repositories/profile-change-requests";

const submitSchema = z.object({
  email: z.string().email(),
  studentName: z.string().min(1),
  cardNumber: z.string().min(1),
});

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const body = submitSchema.safeParse(await request.json());
  if (!body.success) {
    return jsonError("Neispravni podaci zahteva.", 400);
  }

  const student = await getStudentRequestUser(request);
  if (!student) {
    return jsonStudentError(null, "unauthorized", 401);
  }

  const existing = await getPendingRequestByCardNumberDb(body.data.cardNumber);
  if (existing) {
    return jsonOk({ request: existing });
  }

  const record = await createProfileChangeRequestDb(
    student.id,
    body.data.email,
    body.data.studentName,
    body.data.cardNumber,
  );

  return jsonOk({ request: record });
}

export async function GET() {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["referent", "admin"]);
  if ("error" in auth) {
    return auth.error;
  }

  const requests = await listPendingProfileChangeRequestsDb();
  return jsonOk({ requests });
}
