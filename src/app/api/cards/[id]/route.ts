import { z } from "zod";
import { ensureBackendEnabled } from "@/server/api/guard";
import { jsonError, jsonOk, requireRole } from "@/server/auth/session";
import { MAX_TOP_UP, MIN_TOP_UP } from "@/lib/top-up-limits";
import {
  activateCardDb,
  blockCardDb,
  extendCardValidityDb,
  fetchReferentCardsState,
  getCardByIdDb,
  manualTopUpDb,
  unblockCardDb,
  updateCardNotesDb,
  updateCardProfileDb,
} from "@/server/repositories/cards";
import {
  notifyCardActivated,
  notifyCardBlocked,
  notifyCardExtended,
  notifyCardTopUp,
} from "@/server/lib/card-notifications";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  try {
    const { id } = await context.params;
    const card = await getCardByIdDb(id);
    if (!card) {
      return jsonError("Kartica nije pronađena.", 404);
    }

    return jsonOk(card);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Kartica nije dostupna.", 500);
  }
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("activate"), referentName: z.string() }),
  z.object({
    action: z.literal("block"),
    referentName: z.string(),
    reason: z.string().optional(),
    blockedUntil: z.string().optional(),
  }),
  z.object({ action: z.literal("unblock"), referentName: z.string() }),
  z.object({
    action: z.literal("top_up"),
    referentName: z.string(),
    amountRsd: z.number().min(MIN_TOP_UP).max(MAX_TOP_UP),
    note: z.string().optional(),
  }),
  z.object({
    action: z.literal("extend"),
    referentName: z.string(),
    validUntil: z.string(),
  }),
  z.object({ action: z.literal("notes"), notes: z.string() }),
  z.object({
    action: z.literal("update_profile"),
    referentName: z.string(),
    studentName: z.string().optional(),
    email: z.string().optional(),
    role: z.enum(["ucenik", "student"]).optional(),
    faculty: z.string().optional(),
    indexNumber: z.string().optional(),
    cardNumber: z.string().optional(),
  }),
]);

export async function POST(request: Request, context: RouteContext) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const auth = await requireRole(["referent", "admin"]);
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;

  let body;
  try {
    body = actionSchema.parse(await request.json());
  } catch {
    return jsonError("Nevalidan zahtev.", 400);
  }

  try {
    switch (body.action) {
      case "activate": {
        const card = await activateCardDb(id, body.referentName);
        if (card) {
          await notifyCardActivated({
            profileId: card.profileId,
            email: card.email,
            studentName: card.studentName,
          });
        }
        break;
      }
      case "block": {
        await blockCardDb(id, body.referentName, body.reason, body.blockedUntil);
        const card = await getCardByIdDb(id);
        if (card) {
          await notifyCardBlocked(
            { profileId: card.profileId, email: card.email },
            body.reason,
          );
        }
        break;
      }
      case "unblock":
        await unblockCardDb(id, body.referentName);
        break;
      case "top_up": {
        const card = await manualTopUpDb(id, body.amountRsd, body.referentName, body.note);
        if (card) {
          await notifyCardTopUp(
            { profileId: card.profileId, email: card.email },
            body.amountRsd,
            "cash",
          );
        }
        break;
      }
      case "extend": {
        await extendCardValidityDb(id, body.validUntil, body.referentName);
        const card = await getCardByIdDb(id);
        if (card) {
          await notifyCardExtended(
            { profileId: card.profileId, email: card.email },
            body.validUntil,
          );
        }
        break;
      }
      case "notes":
        await updateCardNotesDb(id, body.notes);
        break;
      case "update_profile":
        await updateCardProfileDb(id, {
          studentName: body.studentName,
          email: body.email,
          role: body.role,
          faculty: body.faculty,
          indexNumber: body.indexNumber,
          cardNumber: body.cardNumber,
        }, body.referentName);
        break;
    }

    const state = await fetchReferentCardsState();
    return jsonOk(state);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Akcija nije uspela.", 400);
  }
}
