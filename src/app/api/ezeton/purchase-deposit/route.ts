import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { getStudentRequestUser, jsonError, jsonOk } from "@/server/auth/session";
import { getZetonDepositRsd } from "@/lib/admin-system-store";
import { purchaseTokenDb } from "@/server/repositories/ezeton";

function generateTokenCode(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `EZ-${digits}`;
}

const bodySchema = z.object({
  depositRsd: z.number().nonnegative().optional(),
});

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const user = await getStudentRequestUser();
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  let body;
  try {
    body = bodySchema.parse(await request.json().catch(() => ({})));
  } catch {
    return jsonError("Nevalidan zahtev.", 400);
  }
  const depositRsd = body.depositRsd ?? getZetonDepositRsd();

  try {
    const tokenCode = generateTokenCode();
    const token = await purchaseTokenDb(user.id, tokenCode, depositRsd);
    return jsonOk({ token }, 201);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Kupovina nije uspela.", 400);
  }
}
