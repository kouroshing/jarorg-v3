-- CreateTable
CREATE TABLE "order_deliverables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "order_id" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "file_url" TEXT,
    "link_url" TEXT,
    "label" TEXT,
    "file_name" TEXT,
    "mime_type" TEXT,
    "file_size" INTEGER,
    CONSTRAINT "order_deliverables_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_deliverables_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "order_deliverables_order_id_created_at_idx" ON "order_deliverables"("order_id", "created_at");
