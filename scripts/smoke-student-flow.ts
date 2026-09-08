import "./load-env";
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import {
  cloneSettingsState,
} from "../src/lib/podesavanja-mock";
import { getUserSettingsDb, saveUserSettingsDb } from "../src/server/repositories/settings";
import { getStudentCardByProfileId } from "../src/server/repositories/cards";
import {
  createReservationDb,
  listReservationsForProfile,
  cancelReservationDb,
} from "../src/server/repositories/reservations";
import { fetchJelovnikState } from "../src/server/repositories/menus";
import { closeDb, getDb } from "../src/server/db";
import { dishes, profiles } from "../src/server/db/schema";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const RESERVATION_TEST_DATE = "2026-03-05";
const RESERVATION_TEST_MEAL = "lunch" as const;

async function pickDishName(dishId: string) {
  const db = getDb();
  const [row] = await db.select().from(dishes).where(eq(dishes.id, dishId)).limit(1);
  return row?.name ?? "—";
}

async function main() {
  console.log("eMenza — smoke test (student core flow)\n");

  const db = getDb();
  const [marija] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, "marija.simic@student.rs"))
    .limit(1);

  if (!marija) {
    throw new Error("Demo student Marija not found — run db:seed");
  }

  const card = await getStudentCardByProfileId(marija.id);
  console.log(
    card
      ? `✓ Kartica: ${card.cardNumber}, status=${card.status}, saldo=${card.balanceRsd}`
      : "✗ Kartica nije pronađena",
  );

  if (card?.status !== "active") {
    console.log("✗ Marija kartica nije aktivna — pokrenite db:seed");
  }

  const settings = await getUserSettingsDb(marija.id);
  console.log(`✓ Settings učitana: ${settings.profile.email}`);

  const patched = cloneSettingsState(settings);
  patched.diet.note = `smoke-${Date.now()}`;
  await saveUserSettingsDb(marija.id, patched);
  const reloaded = await getUserSettingsDb(marija.id);
  console.log(
    reloaded.diet.note === patched.diet.note
      ? "✓ Settings persist (DB)"
      : "✗ Settings persist failed",
  );

  const reservations = await listReservationsForProfile(marija.id);
  console.log(`✓ Rezervacije: ${reservations.length} ukupno`);

  const cancellable = reservations.find((entry) => entry.status === "zakazano");
  if (cancellable) {
    await cancelReservationDb(cancellable.id, marija.id);
    const afterCancel = await listReservationsForProfile(marija.id);
    const stillThere = afterCancel.some((entry) => entry.id === cancellable.id);
    console.log(stillThere ? "✗ Cancel nije obrisao rezervaciju" : "✓ Cancel reservation (DB)");
  } else {
    console.log("· Nema zakazane rezervacije za cancel test — preskačem");
  }

  const jelovnik = await fetchJelovnikState();
  const publishedMenu = jelovnik.menus.find(
    (menu) =>
      menu.dateKey === RESERVATION_TEST_DATE &&
      menu.mealType === RESERVATION_TEST_MEAL &&
      menu.published,
  );

  if (!card || !publishedMenu) {
    console.log("✗ Nema objavljenog jelovnika ili kartice za rezervacioni test");
  } else {
    const slotById = Object.fromEntries(publishedMenu.slots.map((slot) => [slot.slotId, slot]));
    const pickFirstAvailable = (slotId: "main" | "side" | "salad" | "dessert") => {
      const slot = slotById[slotId];
      if (!slot) {
        return null;
      }
      return slot.dishIds.find((dishId) => (slot.dishStock[dishId] ?? 0) > 0) ?? null;
    };

    const mainId = pickFirstAvailable("main");
    const sideId = pickFirstAvailable("side");
    const saladId = pickFirstAvailable("salad");
    const dessertId = pickFirstAvailable("dessert");

    if (!mainId || !sideId || !saladId || !dessertId) {
      console.log("✗ Jelovnik nema dovoljno jela sa zalihama za test");
    } else {
      const existing = reservations.find(
        (entry) =>
          entry.dateKey === RESERVATION_TEST_DATE && entry.mealType === RESERVATION_TEST_MEAL,
      );
      if (existing?.status === "zakazano") {
        await cancelReservationDb(existing.id, marija.id);
      }

      try {
        const created = await createReservationDb({
          profileId: marija.id,
          cardId: card.id,
          dateKey: RESERVATION_TEST_DATE,
          mealType: RESERVATION_TEST_MEAL,
          items: {
            glavnoJelo: await pickDishName(mainId),
            dodatak: await pickDishName(sideId),
            salata: await pickDishName(saladId),
            obrok: await pickDishName(dessertId),
            isPosno: false,
          },
          dishIds: {
            main: [mainId],
            side: [sideId],
            salad: [saladId],
            dessert: [dessertId],
          },
          totalRsd: 450,
        });
        console.log(`✓ Rezervacija sa dishIds (DB): ${created.id}`);
        await cancelReservationDb(created.id, marija.id);
        console.log("✓ Cleanup test rezervacije");
      } catch (error) {
        console.log(
          `✗ Rezervacija sa dishIds: ${error instanceof Error ? error.message : "unknown"}`,
        );
      }
    }
  }

  const [petar] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, "petar.petrovic@student.rs"))
    .limit(1);
  const petarCard = petar ? await getStudentCardByProfileId(petar.id) : null;

  if (petar && petarCard && petarCard.status === "pending_verification" && publishedMenu) {
    const mainId = publishedMenu.slots.find((slot) => slot.slotId === "main")?.dishIds[0];
    try {
      await createReservationDb({
        profileId: petar.id,
        cardId: petarCard.id,
        dateKey: RESERVATION_TEST_DATE,
        mealType: RESERVATION_TEST_MEAL,
        items: {
          glavnoJelo: mainId ? await pickDishName(mainId) : "Test",
          dodatak: "—",
          salata: "—",
          obrok: "—",
        },
        dishIds: { main: mainId ? [mainId] : [], side: [], salad: [], dessert: [] },
        totalRsd: 100,
      });
      console.log("✗ Pending kartica je prošla rezervaciju — očekivana greška");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      console.log(
        message.includes("Kartica nije aktivna")
          ? "✓ Pending kartica blokirana pri rezervaciji"
          : `✗ Pending kartica: neočekivana greška (${message})`,
      );
    }
  } else {
    console.log("· Pending kartica test preskočen (nema demo naloga ili kartica je aktivna)");
  }

  const supabase = createClient(url, anon);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "marija.simic@student.rs",
    password: "demo123456",
  });

  if (error || !data.session) {
    console.log(`✗ Supabase login: ${error?.message ?? "no session"}`);
  } else {
    console.log("✓ Supabase student login");
  }

  console.log("\nSmoke test završen.\n");
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
