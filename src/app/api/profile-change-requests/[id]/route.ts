import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { resolveProfileChangeRequestDb } from "@/server/repositories/profile-change-requests";

const resolveSchema = z.object({
  action: z.literal("resolve"),
  referentName: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["referent", "admin"]);
  if ("error" in auth) {
    return auth.error;
  }

  const body = resolveSchema.safeParse(await request.json());
  if (!body.success) {
    return jsonError("Neispravni podaci.", 400);
  }

  const { id } = await params;

  const record = await resolveProfileChangeRequestDb(id, body.data.referentName);
  if (!record) {
    return jsonError("Zahtev nije pronađen.", 404);
  }

  return jsonOk({ request: record });
}
