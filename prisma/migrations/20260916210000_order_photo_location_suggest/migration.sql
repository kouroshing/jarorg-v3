-- Link orders / interests to جار لوکیشن catalog
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "photo_location_id" TEXT;
ALTER TABLE "project_interests" ADD COLUMN IF NOT EXISTS "proposed_photo_location_id" TEXT;

CREATE INDEX IF NOT EXISTS "orders_photo_location_id_idx" ON "orders"("photo_location_id");
CREATE INDEX IF NOT EXISTS "project_interests_proposed_photo_location_id_idx" ON "project_interests"("proposed_photo_location_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_photo_location_id_fkey'
  ) THEN
    ALTER TABLE "orders"
      ADD CONSTRAINT "orders_photo_location_id_fkey"
      FOREIGN KEY ("photo_location_id") REFERENCES "photo_locations"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_interests_proposed_photo_location_id_fkey'
  ) THEN
    ALTER TABLE "project_interests"
      ADD CONSTRAINT "project_interests_proposed_photo_location_id_fkey"
      FOREIGN KEY ("proposed_photo_location_id") REFERENCES "photo_locations"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
