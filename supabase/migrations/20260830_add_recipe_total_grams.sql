ALTER TABLE "dish_recipes"
  ADD COLUMN IF NOT EXISTS "total_grams_per_portion" numeric(12, 3);
