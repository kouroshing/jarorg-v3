-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_verification_codes" (
    "phone" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" DATETIME NOT NULL
);
INSERT INTO "new_verification_codes" ("code", "expires_at", "phone") SELECT "code", "expires_at", "phone" FROM "verification_codes";
DROP TABLE "verification_codes";
ALTER TABLE "new_verification_codes" RENAME TO "verification_codes";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
