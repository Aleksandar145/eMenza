import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["student", "referent", "admin", "kitchen"]);
export const cardStatusEnum = pgEnum("card_status", [
  "pending_verification",
  "active",
  "blocked",
  "expired",
]);
export const cardActionEnum = pgEnum("card_action", [
  "activate",
  "block",
  "unblock",
  "top_up",
  "extend",
  "refund",
  "reversal",
]);
export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner"]);
export const reservationStatusEnum = pgEnum("reservation_status", [
  "zakazano",
  "aktivno",
  "iskorisceno",
  "propusteno",
]);
export const pickupModeEnum = pgEnum("pickup_mode", ["u_menzi", "poneti"]);
export const dishCategoryEnum = pgEnum("dish_category", ["main", "side", "salad", "dessert"]);
export const userTypeEnum = pgEnum("user_type", ["student", "ucenik"]);
export const dishStatusEnum = pgEnum("dish_status", [
  "active",
  "pending_approval",
  "archived",
]);
export const menuSlotEnum = pgEnum("menu_slot", ["main", "side", "salad", "dessert"]);
export const noticePriorityEnum = pgEnum("notice_priority", ["info", "important"]);
export const noticeTargetEnum = pgEnum("notice_target", ["student", "referent", "kitchen", "admin", "both"]);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    clerkUserId: text("clerk_user_id"),
    email: text("email").notNull().unique(),
    displayName: text("display_name").notNull(),
    role: userRoleEnum("role").notNull().default("student"),
    kitchenRole: text("kitchen_role"),
    active: boolean("active").notNull().default(true),
    suspendedReason: text("suspended_reason"),
    userType: userTypeEnum("user_type"),
    dateOfBirth: text("date_of_birth"),
    faculty: text("faculty"),
    indexNumber: text("index_number"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("profiles_clerk_user_id_unique").on(table.clerkUserId)],
);

export const studentCards = pgTable("student_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  cardNumber: text("card_number").notNull().unique(),
  status: cardStatusEnum("status").notNull().default("pending_verification"),
  balanceRsd: numeric("balance_rsd", { precision: 12, scale: 2 }).notNull().default("0"),
  validUntil: text("valid_until").notNull(),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  activatedBy: text("activated_by"),
  notes: text("notes"),
  blockedReason: text("blocked_reason"),
  blockedUntil: text("blocked_until"),
});

export const cardActionLogs = pgTable("card_action_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => studentCards.id, { onDelete: "cascade" }),
  action: cardActionEnum("action").notNull(),
  detail: text("detail").notNull(),
  amountRsd: numeric("amount_rsd", { precision: 12, scale: 2 }),
  referentName: text("referent_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reversalOfId: uuid("reversal_of_id"),
  reversed: boolean("reversed").notNull().default(false),
});

export const dishes = pgTable("dishes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: dishCategoryEnum("category").notNull(),
  priceRsd: integer("price_rsd").notNull(),
  imageUrl: text("image_url").notNull().default(""),
  badges: jsonb("badges").$type<string[]>().notNull().default([]),
  status: dishStatusEnum("status").notNull().default("active"),
  proposedBy: text("proposed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dailyMenus = pgTable(
  "daily_menus",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dateKey: text("date_key").notNull(),
    mealType: mealTypeEnum("meal_type").notNull(),
    published: boolean("published").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("daily_menus_date_meal_idx").on(table.dateKey, table.mealType)],
);

export const dailyMenuSlots = pgTable(
  "daily_menu_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    menuId: uuid("menu_id")
      .notNull()
      .references(() => dailyMenus.id, { onDelete: "cascade" }),
    slotId: menuSlotEnum("slot_id").notNull(),
  },
  (table) => [uniqueIndex("daily_menu_slots_menu_slot_idx").on(table.menuId, table.slotId)],
);

export const dailyMenuSlotDishes = pgTable(
  "daily_menu_slot_dishes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slotRowId: uuid("slot_row_id")
      .notNull()
      .references(() => dailyMenuSlots.id, { onDelete: "cascade" }),
    dishId: uuid("dish_id")
      .notNull()
      .references(() => dishes.id, { onDelete: "cascade" }),
    stock: integer("stock").notNull().default(100),
  },
  (table) => [
    uniqueIndex("daily_menu_slot_dishes_slot_dish_idx").on(table.slotRowId, table.dishId),
  ],
);

export const mealReservations = pgTable("meal_reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  cardId: uuid("card_id")
    .notNull()
    .references(() => studentCards.id, { onDelete: "cascade" }),
  dateKey: text("date_key").notNull(),
  mealType: mealTypeEnum("meal_type").notNull(),
  status: reservationStatusEnum("status").notNull().default("zakazano"),
  pickupMode: pickupModeEnum("pickup_mode").notNull().default("u_menzi"),
  pickupCode: text("pickup_code").notNull().unique(),
  isPosno: boolean("is_posno").notNull().default(false),
  totalRsd: numeric("total_rsd", { precision: 12, scale: 2 }).notNull().default("0"),
  glavnoJelo: text("glavno_jelo").notNull(),
  dodatak: text("dodatak").notNull(),
  salata: text("salata").notNull(),
  obrok: text("obrok").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  usedAt: timestamp("used_at", { withTimezone: true, mode: 'date' })
});

export const appConfig = pgTable("app_config", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const publishedNotices = pgTable("published_notices", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  timeLabel: text("time_label").notNull(),
  priority: noticePriorityEnum("priority").notNull().default("info"),
  target: noticeTargetEnum("target").notNull().default("student"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  archived: boolean("archived").notNull().default(false),
  actionHref: text("action_href"),
  actionLabel: text("action_label"),
});

export const feedbackEntries = pgTable("feedback_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
  initials: text("initials"),
  name: text("name").notNull(),
  dateLabel: text("date_label").notNull(),
  message: text("message").notNull(),
  rating: integer("rating").notNull(),
  helpfulCount: integer("helpful_count").notNull().default(0),
  disagreeCount: integer("disagree_count").notNull().default(0),
  anonymous: boolean("anonymous").notNull().default(false),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewed: boolean("reviewed").notNull().default(false),
  adminReply: text("admin_reply"),
});

export const studentNotifications = pgTable("student_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
  email: text("email"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  category: text("category").notNull().default("general"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  amountRsd: numeric("amount_rsd", { precision: 12, scale: 2 }),
  mealType: mealTypeEnum("meal_type"),
  cardId: uuid("card_id").references(() => studentCards.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  profileId: uuid("profile_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  settings: jsonb("settings").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const institutions = pgTable("institutions", {  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  city: text("city").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
    actionType: text("action_type").notNull(),
    description: text("description").notNull(),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("activity_logs_type_created_idx").on(table.actionType, table.createdAt),
    index("activity_logs_user_idx").on(table.userId),
  ],
);

export const ezetonTokens = pgTable("ezeton_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" })
    .unique(),
  tokenCode: text("token_code").notNull().unique(),
  status: text("status").notNull().default("active"),
  mealName: text("meal_name"),
  mealSlot: text("meal_slot"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userDishRankings = pgTable("user_dish_rankings", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  slotId: menuSlotEnum("slot_id").notNull(),
  dishId: uuid("dish_id")
    .notNull()
    .references(() => dishes.id, { onDelete: "cascade" }),
  rankPosition: integer("rank_position").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const staff = pgTable("staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const noticeReads = pgTable("notice_reads", {
  id: uuid("id").primaryKey().defaultRandom(),
  noticeId: text("notice_id").notNull(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  mealType: mealTypeEnum("meal_type").notNull(),
  staffId: uuid("staff_id")
    .notNull()
    .references(() => staff.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profileChangeRequests = pgTable("profile_change_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  studentName: text("student_name").notNull(),
  cardNumber: text("card_number").notNull(),
  status: text("status", { enum: ["pending", "resolved"] }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  referentName: text("referent_name"),
});

export const magacinIngredients = pgTable("magacin_ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  category: text("category").notNull().default("ostalo"),
  unit: text("unit").notNull().default("kg"),
  ingredientType: text("ingredient_type").notNull().default("main"),
  currentStock: numeric("current_stock", { precision: 12, scale: 3 }).notNull().default("0"),
  minStock: numeric("min_stock", { precision: 12, scale: 3 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const procurementReports = pgTable("procurement_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  dateKey: text("date_key").notNull(),
  label: text("label").notNull(),
  supplier: text("supplier"),
  status: text("status").notNull().default("draft"),
  totalRsd: numeric("total_rsd", { precision: 12, scale: 2 }).notNull().default("0"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
});

export const procurementReportItems = pgTable(
  "procurement_report_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => procurementReports.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id").references(() => magacinIngredients.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull().default("0"),
    unit: text("unit").notNull().default("kg"),
    amountRsd: numeric("amount_rsd", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
  },
  (table) => [index("procurement_report_items_report_idx").on(table.reportId)],
);

export const dishRecipes = pgTable(
  "dish_recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dishName: text("dish_name").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    totalGramsPerPortion: numeric("total_grams_per_portion", { precision: 12, scale: 3 }),
  },
  (table) => [uniqueIndex("dish_recipes_dish_name_idx").on(table.dishName)],
);

export const recipeAppliedDates = pgTable(
  "recipe_applied_dates",
  {
    dateKey: text("date_key").primaryKey(),
    appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const dishRecipeEntries = pgTable(
  "dish_recipe_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => dishRecipes.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id").references(() => magacinIngredients.id, {
      onDelete: "set null",
    }),
    ingredientName: text("ingredient_name").notNull(),
    unit: text("unit").notNull().default("kg"),
    perServing: numeric("per_serving", { precision: 12, scale: 3 })
      .notNull()
      .default("0"),
    used: boolean("used").notNull().default(false),
  },
  (table) => [index("dish_recipe_entries_recipe_idx").on(table.recipeId)],
);

