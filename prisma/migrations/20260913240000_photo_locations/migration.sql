-- CreateTable
CREATE TABLE "photo_locations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "city" TEXT,
    "district" TEXT,
    "address" TEXT,
    "needs_permit" BOOLEAN NOT NULL DEFAULT false,
    "pro_camera_allowed" BOOLEAN NOT NULL DEFAULT true,
    "phone_camera_allowed" BOOLEAN NOT NULL DEFAULT true,
    "has_entrance_fee" BOOLEAN NOT NULL DEFAULT false,
    "has_changing_room" BOOLEAN NOT NULL DEFAULT false,
    "security_level" TEXT NOT NULL DEFAULT 'MEDIUM',
    "contact_phone" TEXT,
    "cover_image_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "reviewed_at" DATETIME,
    "reviewed_by_id" TEXT,
    "submitted_by_id" TEXT,
    CONSTRAINT "photo_locations_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "photo_locations_slug_key" ON "photo_locations"("slug");

-- CreateIndex
CREATE INDEX "photo_locations_status_city_idx" ON "photo_locations"("status", "city");

-- CreateIndex
CREATE INDEX "photo_locations_lat_lng_idx" ON "photo_locations"("lat", "lng");

-- CreateIndex
CREATE INDEX "photo_locations_status_created_at_idx" ON "photo_locations"("status", "created_at");
