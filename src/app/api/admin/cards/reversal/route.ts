import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { reverseCardActionDb } from "@/server/repositories/cards";

const reversalSchema = z.object({
  logId: z.string().min(1),
  adminName: z.string().min(1),
});

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) return disabled;

  const auth = await requireRole(["admin"]);
  if ("error" in auth) {
    return auth.error;
  }

  let body;
  try {
    body = reversalSchema.parse(await request.json());
  } catch {
    return jsonError("Nevalidan zahtev", 400);
  }

  try {
    await reverseCardActionDb(body.logId, body.adminName);
    return jsonOk({ ok: true });
  } catch (err) {
    console.error("[REVERSAL] Greška:", err);
    return jsonError(err instanceof Error ? err.message : "Nepoznata greška", 500);
  }
}
