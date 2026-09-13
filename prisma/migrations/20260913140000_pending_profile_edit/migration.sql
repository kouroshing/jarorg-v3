-- AlterTable
ALTER TABLE "specialist_profiles" ADD COLUMN "pending_profile_edit" TEXT;
ALTER TABLE "specialist_profiles" ADD COLUMN "profile_edit_status" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "specialist_profiles" ADD COLUMN "profile_edit_submitted_at" DATETIME;
ALTER TABLE "specialist_profiles" ADD COLUMN "profile_edit_note" TEXT;
