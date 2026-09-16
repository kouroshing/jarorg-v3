-- CreateTable
CREATE TABLE "order_reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "order_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "reviewee_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    CONSTRAINT "order_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_reviews_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "order_reviews_order_id_direction_key" ON "order_reviews"("order_id", "direction");

-- CreateIndex
CREATE INDEX "order_reviews_reviewee_id_created_at_idx" ON "order_reviews"("reviewee_id", "created_at");

-- CreateIndex
CREATE INDEX "order_reviews_direction_reviewee_id_idx" ON "order_reviews"("direction", "reviewee_id");
