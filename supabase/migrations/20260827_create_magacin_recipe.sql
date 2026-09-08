CREATE TABLE IF NOT EXISTS "dish_recipes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "dish_name" text NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "dish_recipes_dish_name_idx" ON "dish_recipes" ("dish_name");

CREATE TABLE IF NOT EXISTS "recipe_applied_dates" (
  "date_key" text PRIMARY KEY,
  "applied_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "dish_recipe_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "recipe_id" uuid NOT NULL REFERENCES "dish_recipes"("id") ON DELETE cascade,
  "ingredient_id" uuid REFERENCES "magacin_ingredients"("id") ON DELETE set null,
  "ingredient_name" text NOT NULL,
  "unit" text NOT NULL DEFAULT 'kg',
  "per_serving" numeric(12, 3) NOT NULL DEFAULT '0',
  "used" boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS "dish_recipe_entries_recipe_idx" ON "dish_recipe_entries" ("recipe_id");
