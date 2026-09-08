-- eMenza initial schema (apply via Supabase SQL editor or drizzle-kit push)

CREATE TYPE "public"."user_role" AS ENUM('student', 'referent', 'admin', 'kitchen');
CREATE TYPE "public"."card_status" AS ENUM('pending_verification', 'active', 'blocked', 'expired');
CREATE TYPE "public"."card_action" AS ENUM('activate', 'block', 'unblock', 'top_up', 'extend');
CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner');
CREATE TYPE "public"."reservation_status" AS ENUM('zakazano', 'aktivno', 'iskorisceno', 'propusteno');
CREATE TYPE "public"."pickup_mode" AS ENUM('u_menzi', 'poneti');
CREATE TYPE "public"."dish_category" AS ENUM('main', 'side', 'salad', 'dessert');
CREATE TYPE "public"."dish_status" AS ENUM('active', 'pending_approval', 'archived');
CREATE TYPE "public"."menu_slot" AS ENUM('main', 'side', 'salad', 'dessert');
CREATE TYPE "public"."notice_priority" AS ENUM('info', 'important');
CREATE TYPE "public"."notice_target" AS ENUM('student', 'referent', 'both');

CREATE TABLE IF NOT EXISTS "profiles" (
  "id" uuid PRIMARY KEY,
  "email" text NOT NULL UNIQUE,
  "display_name" text NOT NULL,
  "role" "user_role" DEFAULT 'student' NOT NULL,
  "faculty" text,
  "index_number" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "student_cards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE cascade,
  "card_number" text NOT NULL UNIQUE,
  "status" "card_status" DEFAULT 'pending_verification' NOT NULL,
  "balance_rsd" numeric(12, 2) DEFAULT '0' NOT NULL,
  "valid_until" text NOT NULL,
  "registered_at" timestamptz DEFAULT now() NOT NULL,
  "activated_at" timestamptz,
  "activated_by" text,
  "notes" text
);

CREATE TABLE IF NOT EXISTS "card_action_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "card_id" uuid NOT NULL REFERENCES "student_cards"("id") ON DELETE cascade,
  "action" "card_action" NOT NULL,
  "detail" text NOT NULL,
  "amount_rsd" numeric(12, 2),
  "referent_name" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "dishes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "category" "dish_category" NOT NULL,
  "price_rsd" integer NOT NULL,
  "image_url" text DEFAULT '' NOT NULL,
  "badges" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" "dish_status" DEFAULT 'active' NOT NULL,
  "proposed_by" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "daily_menus" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "date_key" text NOT NULL,
  "meal_type" "meal_type" NOT NULL,
  "published" boolean DEFAULT false NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "daily_menus_date_meal_idx" ON "daily_menus" ("date_key", "meal_type");

CREATE TABLE IF NOT EXISTS "daily_menu_slots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "menu_id" uuid NOT NULL REFERENCES "daily_menus"("id") ON DELETE cascade,
  "slot_id" "menu_slot" NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "daily_menu_slots_menu_slot_idx" ON "daily_menu_slots" ("menu_id", "slot_id");

CREATE TABLE IF NOT EXISTS "daily_menu_slot_dishes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slot_row_id" uuid NOT NULL REFERENCES "daily_menu_slots"("id") ON DELETE cascade,
  "dish_id" uuid NOT NULL REFERENCES "dishes"("id") ON DELETE cascade,
  "stock" integer DEFAULT 100 NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "daily_menu_slot_dishes_slot_dish_idx" ON "daily_menu_slot_dishes" ("slot_row_id", "dish_id");

CREATE TABLE IF NOT EXISTS "meal_reservations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE cascade,
  "card_id" uuid NOT NULL REFERENCES "student_cards"("id") ON DELETE cascade,
  "date_key" text NOT NULL,
  "meal_type" "meal_type" NOT NULL,
  "status" "reservation_status" DEFAULT 'zakazano' NOT NULL,
  "pickup_mode" "pickup_mode" DEFAULT 'u_menzi' NOT NULL,
  "pickup_code" text NOT NULL UNIQUE,
  "is_posno" boolean DEFAULT false NOT NULL,
  "total_rsd" numeric(12, 2) DEFAULT '0' NOT NULL,
  "glavno_jelo" text NOT NULL,
  "dodatak" text NOT NULL,
  "salata" text NOT NULL,
  "obrok" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "app_config" (
  "key" text PRIMARY KEY,
  "value" jsonb NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "published_notices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "message" text NOT NULL,
  "time_label" text NOT NULL,
  "priority" "notice_priority" DEFAULT 'info' NOT NULL,
  "target" "notice_target" DEFAULT 'student' NOT NULL,
  "published_at" timestamptz DEFAULT now() NOT NULL,
  "archived" boolean DEFAULT false NOT NULL,
  "action_href" text,
  "action_label" text
);

CREATE TABLE IF NOT EXISTS "feedback_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid REFERENCES "profiles"("id") ON DELETE set null,
  "initials" text,
  "name" text NOT NULL,
  "date_label" text NOT NULL,
  "message" text NOT NULL,
  "rating" integer NOT NULL,
  "helpful_count" integer DEFAULT 0 NOT NULL,
  "anonymous" boolean DEFAULT false NOT NULL,
  "submitted_at" timestamptz DEFAULT now() NOT NULL,
  "reviewed" boolean DEFAULT false NOT NULL,
  "admin_reply" text
);

CREATE TABLE IF NOT EXISTS "student_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid REFERENCES "profiles"("id") ON DELETE cascade,
  "email" text,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "category" text DEFAULT 'general' NOT NULL,
  "read" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" text NOT NULL,
  "amount_rsd" numeric(12, 2),
  "meal_type" "meal_type",
  "card_id" uuid REFERENCES "student_cards"("id") ON DELETE set null,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_settings" (
  "profile_id" uuid PRIMARY KEY REFERENCES "profiles"("id") ON DELETE cascade,
  "settings" jsonb NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_cards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "meal_reservations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON "profiles" FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "student_cards_select_own" ON "student_cards" FOR SELECT TO authenticated USING (profile_id = auth.uid());
