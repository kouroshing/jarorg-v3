-- AlterTable: gallery image URLs (JSON array of strings)
ALTER TABLE "photo_locations" ADD COLUMN IF NOT EXISTS "image_urls" TEXT;
