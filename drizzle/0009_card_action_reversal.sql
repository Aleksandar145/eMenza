ALTER TYPE "card_action" ADD VALUE IF NOT EXISTS 'reversal';
ALTER TABLE "card_action_logs" ADD COLUMN IF NOT EXISTS "reversal_of_id" uuid;
ALTER TABLE "card_action_logs" ADD COLUMN IF NOT EXISTS "reversed" boolean NOT NULL DEFAULT false;
