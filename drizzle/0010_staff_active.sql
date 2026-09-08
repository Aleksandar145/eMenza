ALTER TABLE "profiles" ADD COLUMN "active" boolean NOT NULL DEFAULT true;
ALTER TABLE "profiles" ADD COLUMN "suspended_reason" text;
