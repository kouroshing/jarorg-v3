-- AlterTable
ALTER TABLE "photo_locations" ADD COLUMN "video_urls" TEXT;
ALTER TABLE "photo_locations" ADD COLUMN "photographer_user_id" TEXT;
ALTER TABLE "photo_locations" ADD COLUMN "photographer_name" TEXT;

-- CreateIndex
CREATE INDEX "photo_locations_photographer_user_id_idx" ON "photo_locations"("photographer_user_id");
