import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { parseJsonBody } from "@/server/api/request";
import { jsonError, jsonOk } from "@/server/auth/session";
import {
  assertCardNumberAvailableForRegistration,
  assertEmailAvailableForRegistration,
  REGISTER_CARD_EXISTS_MESSAGE,
  REGISTER_EMAIL_EXISTS_MESSAGE,
} from "@/server/repositories/auth";

const validateSchema = z
  .object({
    email: z.string().email().optional(),
    cardNumber: z.string().optional(),
  })
  .refine((body) => body.email || body.cardNumber, {
    message: "Unesite email ili broj kartice.",
  });

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const parsed = await parseJsonBody(request, validateSchema);
  if ("error" in parsed) {
    return parsed.error;
  }

  const { email, cardNumber } = parsed.data;

  try {
    if (email) {
      await assertEmailAvailableForRegistration(email);
    }
    if (cardNumber) {
      await assertCardNumberAvailableForRegistration(cardNumber);
    }
    return jsonOk({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Validacija nije uspela.";
    if (
      message === REGISTER_EMAIL_EXISTS_MESSAGE ||
      message === REGISTER_CARD_EXISTS_MESSAGE
    ) {
      return jsonError(message, 409);
    }
    return jsonError(message, 400);
  }
}
