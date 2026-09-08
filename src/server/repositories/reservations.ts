import { and, desc, eq } from "drizzle-orm";
import { DEFAULT_WORKING_HOURS } from "@/lib/admin-system-mock";
import type { MealDetailsRow, MealPickupMode, MealReservationStatus } from "@/lib/dashboard-mock";
import {
  getCancellationWindowMessage,
  isMealReservationWindowPassed,
} from "@/lib/meal-booking-window";
import { resolveEffectiveReservationStatus } from "@/lib/meal-reservation-status";
import type { MealType, WorkingHoursRow } from "@/lib/meal-types";
import { getDb } from "@/server/db";
import { dailyMenus, mealReservations, profiles, studentCards } from "@/server/db/schema";
import { appendCardActionLogDb } from "@/server/repositories/card-action-logs";
import { consumeTokenDb } from "@/server/repositories/ezeton";
import { fetchAdminSystemState } from "@/server/repositories/admin";
import { findDishByName } from "@/server/repositories/dishes";
import { decrementDishStockDb, incrementDishStockDb } from "@/server/repositories/menus";

const WORKING_HOURS_CACHE_TTL_MS = 60_000;
let cachedWorkingHours: WorkingHoursRow[] | null = null;
let cachedBookingCutoffHours = 24;
let cachedCancellationCutoffHours = 24;
let cachedWorkingHoursAt = 0;

async function getWorkingHoursForPromotion() {
  const now = Date.now();
  if (cachedWorkingHours && now - cachedWorkingHoursAt < WORKING_HOURS_CACHE_TTL_MS) {
    return { workingHours: cachedWorkingHours, bookingCutoffHours: cachedBookingCutoffHours, cancellationCutoffHours: cachedCancellationCutoffHours };
  }

  try {
    const adminState = await fetchAdminSystemState();
    cachedWorkingHours = adminState.workingHours;
    cachedBookingCutoffHours = adminState.bookingCutoffHours ?? 24;
    cachedCancellationCutoffHours = adminState.cancellationCutoffHours ?? 24;
    cachedWorkingHoursAt = now;
    return { workingHours: cachedWorkingHours, bookingCutoffHours: cachedBookingCutoffHours, cancellationCutoffHours: cachedCancellationCutoffHours };
  } catch {
    return { workingHours: cachedWorkingHours ?? DEFAULT_WORKING_HOURS, bookingCutoffHours: cachedBookingCutoffHours, cancellationCutoffHours: cachedCancellationCutoffHours };
  }
}

export type ReservationDishIds = {
  main: string[];
  side: string[];
  salad: string[];
  dessert: string[];
};

const dishIdSlots: (keyof ReservationDishIds)[] = ["main", "side", "salad", "dessert"];

function mealTypeLabelSerbian(mealType: MealType) {
  switch (mealType) {
    case "breakfast":
      return "Doručak";
    case "lunch":
      return "Ručak";
  }
  return "Večera";
}

function generatePickupCode(dateKey: string, mealType: MealType) {
  const mealLetter = mealType === "breakfast" ? "B" : mealType === "lunch" ? "L" : "D";
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `EMZ-${dateKey.replace(/-/g, "")}-${mealLetter}-${suffix}`;
}

export type ReservationRecord = {
  id: string;
  dateKey: string;
  mealType: MealType;
  status: MealReservationStatus;
  items: MealDetailsRow;
  pickupMode?: MealPickupMode;
  pickupCode: string;
  totalRsd: number;
  studentName?: string;
  userType?: string | null;
  dateOfBirth?: string | null;
  faculty?: string | null;
  cardNumber?: string | null;
  profileId?: string;
};

function mapReservation(row: typeof mealReservations.$inferSelect): ReservationRecord {
  return {
    id: row.id,
    dateKey: row.dateKey,
    mealType: row.mealType as MealType,
    status: row.status as MealReservationStatus,
    pickupMode: row.pickupMode as MealPickupMode,
    pickupCode: row.pickupCode,
    totalRsd: Number(row.totalRsd),
    items: {
      glavnoJelo: row.glavnoJelo,
      dodatak: row.dodatak,
      salata: row.salata,
      obrok: row.obrok,
      isPosno: row.isPosno,
    },
  };
}

export async function listReservationsForProfile(profileId: string, appNow: Date = new Date()) {
  const db = getDb();
  const rows = await db
    .select()
    .from(mealReservations)
    .where(eq(mealReservations.profileId, profileId))
    .orderBy(desc(mealReservations.dateKey));

  const { workingHours } = await getWorkingHoursForPromotion();

  for (const row of rows) {
    const mealType = row.mealType as MealType;
    const effectiveStatus = resolveEffectiveReservationStatus(
      row.dateKey,
      mealType,
      row.status as MealReservationStatus,
      workingHours,
      appNow,
    );

    if (row.status !== effectiveStatus && effectiveStatus !== "nerezervisano") {
      await db
        .update(mealReservations)
        .set({ status: effectiveStatus })
        .where(eq(mealReservations.id, row.id));
    }
  }

  return rows.map((row) => {
    const mealType = row.mealType as MealType;
    const effectiveStatus = resolveEffectiveReservationStatus(
      row.dateKey,
      mealType,
      row.status as MealReservationStatus,
      workingHours,
      appNow,
    );

    const statusForMap =
      effectiveStatus === "nerezervisano"
        ? (row.status as Exclude<MealReservationStatus, "nerezervisano">)
        : effectiveStatus;

    return mapReservation({ ...row, status: statusForMap });
  });
}

export async function getReservationByPickupCode(code: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(mealReservations)
    .leftJoin(profiles, eq(mealReservations.profileId, profiles.id))
    .where(eq(mealReservations.pickupCode, code.trim()))
    .limit(1);

  if (!row || row.meal_reservations.status === "iskorisceno") {
    return null;
  }

  const reservation = mapReservation(row.meal_reservations);
  reservation.studentName = row.profiles?.displayName ?? undefined;
  reservation.userType = row.profiles?.userType ?? null;
  reservation.dateOfBirth = row.profiles?.dateOfBirth ?? null;
  reservation.faculty = row.profiles?.faculty ?? null;
  reservation.profileId = row.meal_reservations.profileId;
  return reservation;
}

export async function createReservationDb(input: {
  profileId: string;
  cardId: string;
  dateKey: string;
  mealType: MealType;
  items: MealDetailsRow;
  dishIds?: ReservationDishIds;
  pickupMode?: MealPickupMode;
  isPosno?: boolean;
  totalRsd: number;
  appNow?: Date;
}) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(mealReservations)
      .where(
        and(
          eq(mealReservations.profileId, input.profileId),
          eq(mealReservations.dateKey, input.dateKey),
          eq(mealReservations.mealType, input.mealType),
        ),
      )
      .limit(1);

    if (existing) {
      throw new Error("Rezervacija za ovaj obrok već postoji.");
    }

    const [card] = await tx
      .select()
      .from(studentCards)
      .where(eq(studentCards.id, input.cardId))
      .limit(1);

    if (!card || card.status !== "active") {
      throw new Error("Kartica nije aktivna.");
    }

    if (Number(card.balanceRsd) < input.totalRsd) {
      throw new Error("Nedovoljno sredstava na kartici.");
    }

    const [publishedMenu] = await tx
      .select()
      .from(dailyMenus)
      .where(
        and(eq(dailyMenus.dateKey, input.dateKey), eq(dailyMenus.mealType, input.mealType)),
      )
      .limit(1);

    if (!publishedMenu?.published) {
      throw new Error("Jelovnik nije objavljen za izabrani dan/obrok.");
    }

    if (input.dishIds) {
      await decrementReservationStockByIds(input.dateKey, input.mealType, input.dishIds);
    } else {
      await decrementReservationStock(input.dateKey, input.mealType, input.items);
    }

    const pickupCode = generatePickupCode(input.dateKey, input.mealType);

    const [reservation] = await tx
      .insert(mealReservations)
      .values({
        profileId: input.profileId,
        cardId: input.cardId,
        dateKey: input.dateKey,
        mealType: input.mealType,
        status: "zakazano",
        pickupMode: input.pickupMode ?? "u_menzi",
        pickupCode,
        isPosno: input.isPosno ?? input.items.isPosno ?? false,
        totalRsd: String(input.totalRsd),
        glavnoJelo: input.items.glavnoJelo,
        dodatak: input.items.dodatak,
        salata: input.items.salata,
        obrok: input.items.obrok,
      })
      .returning();

    await tx
      .update(studentCards)
      .set({ balanceRsd: String(Number(card.balanceRsd) - input.totalRsd) })
      .where(eq(studentCards.id, input.cardId));

    return mapReservation(reservation);
  });
}

async function decrementReservationStockByIds(
  dateKey: string,
  mealType: MealType,
  dishIds: ReservationDishIds,
) {
  for (const slotId of dishIdSlots) {
    for (const dishId of dishIds[slotId]) {
      if (!dishId) {
        continue;
      }
      await decrementDishStockDb(dateKey, mealType, dishId, 1);
    }
  }
}

async function decrementReservationStock(
  dateKey: string,
  mealType: MealType,
  items: MealDetailsRow,
) {
  const names = [items.glavnoJelo, items.dodatak, items.salata, items.obrok];

  for (const rawName of names) {
    const dish = await findDishByName(rawName);
    if (!dish) {
      continue;
    }
    const multiplyMatch = rawName.match(/×\s*(\d+)/);
    const quantity = multiplyMatch ? Number(multiplyMatch[1]) : 1;
    await decrementDishStockDb(dateKey, mealType, dish.id, quantity);
  }
}

async function incrementReservationStock(
  dateKey: string,
  mealType: MealType,
  items: MealDetailsRow,
) {
  const names = [items.glavnoJelo, items.dodatak, items.salata, items.obrok];

  for (const rawName of names) {
    const dish = await findDishByName(rawName);
    if (!dish) {
      continue;
    }
    const multiplyMatch = rawName.match(/×\s*(\d+)/);
    const quantity = multiplyMatch ? Number(multiplyMatch[1]) : 1;
    await incrementDishStockDb(dateKey, mealType, dish.id, quantity);
  }
}

export async function getReservationByIdForProfile(reservationId: string, profileId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(mealReservations)
    .where(
      and(eq(mealReservations.id, reservationId), eq(mealReservations.profileId, profileId)),
    )
    .limit(1);

  return row ? mapReservation(row) : null;
}

export async function cancelReservationDb(
  reservationId: string,
  profileId: string,
  appNow: Date = new Date(),
) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(mealReservations)
      .where(
        and(eq(mealReservations.id, reservationId), eq(mealReservations.profileId, profileId)),
      )
      .limit(1);

    if (!row) {
      throw new Error("Rezervacija nije pronađena.");
    }

    if (row.status === "iskorisceno" || row.status === "propusteno") {
      throw new Error("Samo zakazane rezervacije mogu biti otkazane.");
    }

    const { workingHours, cancellationCutoffHours } = await getWorkingHoursForPromotion();
    if (
      isMealReservationWindowPassed(
        row.dateKey,
        row.mealType as MealType,
        appNow,
        workingHours,
        cancellationCutoffHours,
      )
    ) {
      throw new Error(getCancellationWindowMessage(cancellationCutoffHours));
    }

    if (row.status === "aktivno") {
      throw new Error("Rezervacija je u toku i ne može se otkazati.");
    }

    if (row.status !== "zakazano") {
      throw new Error("Samo zakazane rezervacije mogu biti otkazane.");
    }

    const [card] = await tx
      .select()
      .from(studentCards)
      .where(eq(studentCards.id, row.cardId))
      .limit(1);

    if (card) {
      await tx
        .update(studentCards)
        .set({ balanceRsd: String(Number(card.balanceRsd) + Number(row.totalRsd)) })
        .where(eq(studentCards.id, row.cardId));

      await appendCardActionLogDb(
        {
          cardId: row.cardId,
          action: "refund",
          detail: `Refundacija: ${mealTypeLabelSerbian(row.mealType as MealType)} ${row.dateKey}`,
          referentName: "Sistem",
          amountRsd: Number(row.totalRsd),
        },
        tx,
      );
    }

    const items: MealDetailsRow = {
      glavnoJelo: row.glavnoJelo,
      dodatak: row.dodatak,
      salata: row.salata,
      obrok: row.obrok,
      isPosno: row.isPosno,
    };

    await incrementReservationStock(row.dateKey, row.mealType as MealType, items);

    await tx.delete(mealReservations).where(eq(mealReservations.id, reservationId));

    return mapReservation(row);
  });
}

export async function listKitchenReservations(dateKey: string, mealType: MealType) {
  const db = getDb();
  const rows = await db
    .select()
    .from(mealReservations)
    .where(
      and(eq(mealReservations.dateKey, dateKey), eq(mealReservations.mealType, mealType)),
    );

  return rows
    .filter((row) => row.status === "zakazano" || row.status === "aktivno")
    .map(mapReservation);
}

export async function getKitchenAllReservationsDb(dateKey: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(mealReservations)
    .leftJoin(profiles, eq(mealReservations.profileId, profiles.id))
    .leftJoin(studentCards, eq(mealReservations.cardId, studentCards.id))
    .where(eq(mealReservations.dateKey, dateKey));

  return rows.map((row) => {
    const reservation = mapReservation(row.meal_reservations);
    reservation.studentName = row.profiles?.displayName ?? undefined;
    reservation.userType = row.profiles?.userType ?? null;
    reservation.dateOfBirth = row.profiles?.dateOfBirth ?? null;
    reservation.faculty = row.profiles?.faculty ?? null;
    reservation.cardNumber = row.student_cards?.cardNumber ?? null;
    return reservation;
  });
}

export async function markReservationPickedUp(pickupCode: string) {
  const cleanCode = pickupCode.trim();
  const db = getDb();

  const reservation = await db.query.mealReservations.findFirst({
    where: eq(mealReservations.pickupCode, cleanCode),
  });

  if (!reservation) {
    return null;
  }

  if (reservation.status === "iskorisceno") {
    throw new Error("Ovaj obrok je već preuzet!");
  }

  const [updated] = await db
    .update(mealReservations)
    .set({ 
      status: "iskorisceno",
      usedAt: new Date(), 
    })
    .where(eq(mealReservations.pickupCode, cleanCode))
    .returning();

  if (updated && reservation.profileId) {
    const mealName = reservation.glavnoJelo || undefined;
    await consumeTokenDb(reservation.profileId, mealName, null).catch(() => {
      // silently ignore — token may not exist
    });
  }

  return updated ? mapReservation(updated) : null;
} 