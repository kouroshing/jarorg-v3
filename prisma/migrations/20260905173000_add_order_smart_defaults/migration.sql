-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "category_slug" TEXT NOT NULL,
    "category_title" TEXT,
    "is_flexible_schedule" BOOLEAN NOT NULL DEFAULT true,
    "booking_date" TEXT,
    "time_slot" TEXT,
    "duration_hours" INTEGER NOT NULL DEFAULT 2,
    "location_type" TEXT NOT NULL DEFAULT 'SPECIALIST_ADVICE',
    "location_address" TEXT,
    "district_or_city" TEXT,
    "reference_link" TEXT,
    "moodboard_urls" TEXT,
    "project_description" TEXT,
    "is_auto_priced" BOOLEAN NOT NULL DEFAULT true,
    "hourly_rate" INTEGER NOT NULL,
    "total_estimated_price" INTEGER NOT NULL,
    "deposit_amount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'MATCHING',
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "user_id" TEXT,
    "selected_specialist_id" TEXT,
    CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "orders_selected_specialist_id_fkey" FOREIGN KEY ("selected_specialist_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_orders" ("booking_date", "category_slug", "category_title", "contact_name", "contact_phone", "created_at", "deposit_amount", "district_or_city", "duration_hours", "hourly_rate", "id", "location_address", "location_type", "moodboard_urls", "project_description", "reference_link", "selected_specialist_id", "status", "time_slot", "total_estimated_price", "updated_at", "user_id") SELECT "booking_date", "category_slug", "category_title", "contact_name", "contact_phone", "created_at", "deposit_amount", "district_or_city", "duration_hours", "hourly_rate", "id", "location_address", "location_type", "moodboard_urls", "project_description", "reference_link", "selected_specialist_id", "status", "time_slot", "total_estimated_price", "updated_at", "user_id" FROM "orders";
DROP TABLE "orders";
ALTER TABLE "new_orders" RENAME TO "orders";
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");
CREATE INDEX "orders_status_idx" ON "orders"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
