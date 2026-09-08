import { z } from "zod";
import type { MealDetailsRow, MealPickupMode } from "@/lib/dashboard-mock";
import type { MealType } from "@/lib/meal-types";
import { ensureBackendEnabled } from "@/server/api/guard";
import { getProfileByUserId, getStudentRequestUser, jsonOk } from "@/server/auth/session";
import { jsonStudentError } from "@/server/i18n/student-errors";
import { getStudentCardByProfileId } from "@/server/repositories/cards";
import { appendActivityLogDb } from "@/server/repositories/activity-logs";
import { getStudentTokenDb } from "@/server/repositories/ezeton";
import {
  cancelReservationDb,
  createReservationDb,
  getKitchenAllReservationsDb,
  getReservationByPickupCode,
  listKitchenReservations,
  listReservationsForProfile,
  markReservationPickedUp,
} from "@/server/repositories/reservations";
import { appendAnalyticsEventDb } from "@/server/repositories/admin";
import { DEFAULT_WORKING_HOURS } from "@/lib/admin-system-mock";
import {
  getCancellationWindowMessage,
  isMealReservationWindowPassed,
} from "@/lib/meal-booking-window";
import { fetchAdminSystemState } from "@/server/repositories/admin";
import { getRequestAppNow } from "@/server/app-time";
import { markKitchenReservationPickedUp } from "@/lib/kuhinja-mock";

export async function GET(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const { searchParams } = new URL(request.url);
  const pickupCode = searchParams.get("pickupCode");
  const dateKey = searchParams.get("dateKey");
  const mealType = searchParams.get("mealType") as MealType | null;
  const kitchen = searchParams.get("kitchen") === "1";

  if (pickupCode) {
    const reservation = await getReservationByPickupCode(pickupCode);
    if (!reservation) {
      return jsonStudentError(null, "reservationNotFound", 404);
    }
    let zetonStatus: string | undefined;
    if (reservation.profileId) {
      try {
        const token = await getStudentTokenDb(reservation.profileId);
        if (token) {
          zetonStatus = token.status;
        }
      } catch {
        // token lookup is best-effort
      }
    }
    return jsonOk({ reservation, zetonStatus });
  }

  if (kitchen && dateKey && mealType) {
    const reservations = await listKitchenReservations(dateKey, mealType);
    return jsonOk({ reservations });
  }

  if (kitchen && dateKey && searchParams.get("all") === "1") {
    const reservations = await getKitchenAllReservationsDb(dateKey);
    return jsonOk({ reservations });
  }

  const user = await getStudentRequestUser();
  if (!user) {
    return jsonStudentError(null, "unauthorized", 401);
  }

  const reservations = await listReservationsForProfile(user.id, getRequestAppNow(request));
  return jsonOk({ reservations });
}

const createSchema = z.object({
  dateKey: z.string(),
  mealType: z.enum(["breakfast", "lunch", "dinner"]),
  items: z.custom<MealDetailsRow>(),
  dishIds: z
    .object({
      main: z.array(z.string()),
      side: z.array(z.string()),
      salad: z.array(z.string()),
      dessert: z.array(z.string()),
    })
    .optional(),
  pickupMode: z.enum(["u_menzi", "poneti"]).optional(),
  isPosno: z.boolean().optional(),
  totalRsd: z.number().positive(),
});

export async function POST(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const user = await getStudentRequestUser();
  if (!user) {
    return jsonStudentError(null, "mustBeLoggedIn", 401);
  }

  try {
    const body = createSchema.parse(await request.json());

    let workingHours = DEFAULT_WORKING_HOURS;
    let bookingCutoffHours = 24;
    try {
      const adminState = await fetchAdminSystemState();
      workingHours = adminState.workingHours;
      bookingCutoffHours = adminState.bookingCutoffHours ?? 24;
    } catch {
      // Fallback to defaults when admin state is unavailable.
    }

    const appNow = getRequestAppNow(request);

    if (
      isMealReservationWindowPassed(
        body.dateKey,
        body.mealType as MealType,
        appNow,
        workingHours,
        bookingCutoffHours,
      )
    ) {
      return jsonStudentError(user.id, "bookingWindowPassed", 400);
    }

    const card = await getStudentCardByProfileId(user.id);
    if (!card || card.status !== "active") {
      return jsonStudentError(user.id, "cardNotActive", 403);
    }

    const reservation = await createReservationDb({
      profileId: user.id,
      cardId: card.id,
      dateKey: body.dateKey,
      mealType: body.mealType as MealType,
      items: body.items,
      dishIds: body.dishIds,
      pickupMode: body.pickupMode as MealPickupMode | undefined,
      isPosno: body.isPosno,
      totalRsd: body.totalRsd,
      appNow,
    });

    await appendAnalyticsEventDb({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      type: "reservation",
      amountRsd: body.totalRsd,
      mealType: body.mealType as MealType,
      cardId: card.id,
    });

    const profile = await getProfileByUserId(user.id);
    await appendActivityLogDb({
      userId: user.id,
      actionType: "reservation.create",
      description: `Kreirana rezervacija: ${body.dateKey} ${body.mealType} (${body.totalRsd} RSD)`,
      ipAddress: request.headers.get("x-forwarded-for"),
    });
    return jsonOk({ reservation, profileEmail: profile?.email });
  } catch {
    return jsonStudentError(user.id, "reservationFailed", 400);
  }
}

export async function PATCH(request: Request) {
  const disabled = ensureBackendEnabled();
  if (!disabled) {
    try {
      let pickupCode: string | null = null;

      try {
        const body = await request.json();
        pickupCode = body.pickupCode;
      } catch {
        const { searchParams } = new URL(request.url);
        pickupCode = searchParams.get("pickupCode");
      }

      if (!pickupCode) {
        return new Response("Nije poslat pickupCode", { status: 400 });
      }

      const cleanCode = pickupCode.trim();

      const user = await getStudentRequestUser();
      if (!user) {
        return new Response("Unauthorized", { status: 401 });
      }

      const result = await markReservationPickedUp(cleanCode);

      await appendActivityLogDb({
        userId: user.id,
        actionType: "reservation.pickup",
        description: `Preuzeta rezervacija: ${cleanCode}`,
        ipAddress: request.headers.get("x-forwarded-for"),
      });

      return jsonOk({ success: true, reservation: result });
    } catch {
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
  }

  // Mock mode fallback — update in-memory store
  try {
    let pickupCode: string | null = null;
    try {
      const body = await request.json();
      pickupCode = body.pickupCode;
    } catch {
      const { searchParams } = new URL(request.url);
      pickupCode = searchParams.get("pickupCode");
    }
    if (!pickupCode) {
      return new Response("Nije poslat pickupCode", { status: 400 });
    }
    const result = markKitchenReservationPickedUp(pickupCode.trim());
    if (!result) {
      return new Response(JSON.stringify({ error: "Rezervacija nije pronađena." }), { status: 404 });
    }
    return jsonOk({ success: true, reservation: result });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}
export async function DELETE(request: Request) {
  const disabled = ensureBackendEnabled();
  if (disabled) {
    return disabled;
  }

  const user = await getStudentRequestUser();
  if (!user) {
    return jsonStudentError(null, "unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return jsonStudentError(user.id, "missingReservationId", 400);
  }

  try {
    const reservation = await cancelReservationDb(id, user.id, getRequestAppNow(request));
    await appendActivityLogDb({
      userId: user.id,
      actionType: "reservation.cancel",
      description: `Otkazana rezervacija: ${id}`,
      ipAddress: request.headers.get("x-forwarded-for"),
    });
    return jsonOk({ reservation });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message?.startsWith("Termin za otkazivanje je prošao")) {
        return jsonStudentError(user.id, "cancellationWindowPassed", 400);
      }
      if (error.message === "Rezervacija nije pronađena.") {
        return jsonStudentError(user.id, "reservationNotFound", 404);
      }
      if (
        error.message === "Samo zakazane rezervacije mogu biti otkazane." ||
        error.message === "Rezervacija je u toku i ne može se otkazati."
      ) {
        return jsonStudentError(user.id, "cancelNotAllowed", 400);
      }
    }

    console.error("[DELETE /api/reservations]", error);
    return jsonStudentError(user.id, "cancelFailed", 400);
  }
}
