-- AlterTable
ALTER TABLE "orders" ADD COLUMN "published_at" DATETIME;
ALTER TABLE "orders" ADD COLUMN "no_match_at" DATETIME;

-- AlterTable
ALTER TABLE "pwa_settings" ADD COLUMN "matching_timeout_days" INTEGER NOT NULL DEFAULT 7;
