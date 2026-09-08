CREATE TABLE IF NOT EXISTS "magacin_ingredients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "category" text NOT NULL DEFAULT 'ostalo',
  "unit" text NOT NULL DEFAULT 'kg',
  "ingredient_type" text NOT NULL DEFAULT 'main',
  "current_stock" numeric(12, 3) NOT NULL DEFAULT '0',
  "min_stock" numeric(12, 3) NOT NULL DEFAULT '0',
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "procurement_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "date_key" text NOT NULL,
  "label" text NOT NULL,
  "supplier" text,
  "status" text NOT NULL DEFAULT 'draft',
  "total_rsd" numeric(12, 2) NOT NULL DEFAULT '0',
  "created_by" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "finalized_at" timestamptz
);

CREATE TABLE IF NOT EXISTS "procurement_report_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "report_id" uuid NOT NULL REFERENCES "procurement_reports"("id") ON DELETE cascade,
  "ingredient_id" uuid REFERENCES "magacin_ingredients"("id") ON DELETE set null,
  "name" text NOT NULL,
  "quantity" numeric(12, 3) NOT NULL DEFAULT '0',
  "unit" text NOT NULL DEFAULT 'kg',
  "amount_rsd" numeric(12, 2) NOT NULL DEFAULT '0'
);

CREATE INDEX IF NOT EXISTS "procurement_report_items_report_idx" ON "procurement_report_items" ("report_id");
