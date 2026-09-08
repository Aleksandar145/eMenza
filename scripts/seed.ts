import "./load-env";
import { createInitialAdminSystemState } from "../src/lib/admin-system-mock";
import { createInitialDishCatalogState } from "../src/lib/dish-catalog-mock";
import { createInitialKuhinjaJelovnikState } from "../src/lib/kuhinja-mock";
import { createInitialReferentCardsState } from "../src/lib/referent-cards-mock";
import { ADMIN_MOCK_CREDENTIALS } from "../src/lib/admin-system-mock";
import { KUHINJA_MOCK_ACCOUNTS } from "../src/lib/kuhinja-mock";
import { REFERENT_MOCK_CREDENTIALS } from "../src/lib/referent-cards-mock";
import { isBackendEnabled } from "../src/server/env";
import { getDb, closeDb } from "../src/server/db";
import { appConfig, dishes, studentCards } from "../src/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createStaffUser, registerStudentAccount } from "../src/server/repositories/auth";
import type { RegisterDraft } from "../src/lib/register-mock";
import { ensureDailyMenuDb, setSlotDishIdsDb } from "../src/server/repositories/menus";
import { saveAdminConfigPartial } from "../src/server/repositories/admin";

async function syncDemoCardStatuses() {
  const cardsState = createInitialReferentCardsState();
  const db = getDb();

  for (const mockCard of cardsState.cards) {
    const digits = mockCard.cardNumber.replace(/\D/g, "");
    await db
      .update(studentCards)
      .set({
        status: mockCard.status,
        balanceRsd: String(mockCard.balanceRsd),
        activatedAt: mockCard.activatedAt ? new Date(mockCard.activatedAt) : null,
        activatedBy: mockCard.activatedBy ?? null,
      })
      .where(eq(studentCards.cardNumber, digits));
  }
}

async function main() {
  if (!isBackendEnabled()) {
    console.error("Set DATABASE_URL and Supabase env vars before seeding.");
    process.exit(1);
  }

  const db = getDb();
  console.log("Seeding eMenza database...");

  const adminState = createInitialAdminSystemState();
  await db
    .insert(appConfig)
    .values({ key: "admin_system", value: adminState })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value: adminState, updatedAt: new Date() },
    });

  const catalog = createInitialDishCatalogState();
  const dishIdMap = new Map<string, string>();

  for (const dish of catalog.dishes) {
    const [existing] = await db
      .select()
      .from(dishes)
      .where(and(eq(dishes.name, dish.name), eq(dishes.category, dish.category)))
      .limit(1);

    if (existing) {
      dishIdMap.set(dish.id, existing.id);
      dishIdMap.set(dish.name, existing.id);
      continue;
    }

    const [row] = await db
      .insert(dishes)
      .values({
        name: dish.name,
        category: dish.category,
        priceRsd: dish.priceRsd,
        imageUrl: dish.imageUrl,
        badges: dish.badges,
        status: dish.status,
        proposedBy: dish.proposedBy ?? null,
      })
      .returning();

    dishIdMap.set(dish.id, row.id);
    dishIdMap.set(dish.name, row.id);
  }

  const jelovnik = createInitialKuhinjaJelovnikState();
  for (const menu of jelovnik.menus) {
    await ensureDailyMenuDb(menu.dateKey, menu.mealType);
    for (const slot of menu.slots) {
      const dishIds = slot.dishIds
        .map((legacyId) => dishIdMap.get(legacyId))
        .filter(Boolean) as string[];
      if (dishIds.length > 0) {
        await setSlotDishIdsDb(
          menu.dateKey,
          menu.mealType,
          slot.slotId,
          dishIds,
          slot.dishStock,
        );
      }
    }
    if (menu.published) {
      const { toggleDailyMenuPublishedDb } = await import("../src/server/repositories/menus");
      await toggleDailyMenuPublishedDb(menu.dateKey, menu.mealType, true);
    }
  }

  for (const staff of [
    { ...ADMIN_MOCK_CREDENTIALS, role: "admin" as const },
    { ...REFERENT_MOCK_CREDENTIALS, role: "referent" as const },
    ...KUHINJA_MOCK_ACCOUNTS.map((account) => ({
      email: account.email,
      password: account.password,
      displayName: account.displayName,
      role: "kitchen" as const,
    })),
  ]) {
    try {
      await createStaffUser(staff.email, staff.password, staff.displayName, staff.role);
    } catch {
      // skip duplicates on re-seed
    }
  }

  const cardsState = createInitialReferentCardsState();
  for (const card of cardsState.cards) {
    const draft: RegisterDraft = {
      step: 3,
      authMethod: "email",
      firstName: card.studentName.split(" ")[0] ?? "Demo",
      lastName: card.studentName.split(" ").slice(1).join(" ") || "Student",
      email: card.email,
      password: "demo123456",
      role: "student",
      religion: "",
      faculty: card.faculty,
      indexNumber: card.indexNumber,
      cardNumber: card.cardNumber,
      termsAccepted: true,
    };

    try {
      await registerStudentAccount(draft);
    } catch {
      // skip duplicates on re-seed
    }
  }

  await syncDemoCardStatuses();

  await saveAdminConfigPartial(adminState);
  console.log("Seed complete.");
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
