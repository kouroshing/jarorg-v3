-- Specialist schedule stance on project interests
ALTER TABLE "project_interests" ADD COLUMN "schedule_stance" TEXT NOT NULL DEFAULT 'ACCEPT_CLIENT';
ALTER TABLE "project_interests" ADD COLUMN "proposed_booking_date" TEXT;
ALTER TABLE "project_interests" ADD COLUMN "proposed_time_slot" TEXT;
