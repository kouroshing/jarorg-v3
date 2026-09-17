-- AlterTable
ALTER TABLE "photo_locations" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX "photo_locations_status_category_idx" ON "photo_locations"("status", "category");
