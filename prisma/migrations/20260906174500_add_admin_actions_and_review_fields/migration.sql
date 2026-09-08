-- AlterTable
ALTER TABLE "orders" ADD COLUMN "admin_cancel_note" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_portfolio_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "specialist_id" TEXT NOT NULL,
    "category_slug" TEXT NOT NULL,
    "category_type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "title" TEXT,
    "caption" TEXT,
    "file_size" INTEGER,
    "review_status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "portfolio_items_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialist_profiles" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_portfolio_items" ("caption", "category_slug", "category_type", "created_at", "file_size", "file_url", "id", "media_type", "specialist_id", "title") SELECT "caption", "category_slug", "category_type", "created_at", "file_size", "file_url", "id", "media_type", "specialist_id", "title" FROM "portfolio_items";
DROP TABLE "portfolio_items";
ALTER TABLE "new_portfolio_items" RENAME TO "portfolio_items";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
