-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "display_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "experts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "verification_codes" (
    "phone" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "otp_send_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "service_type" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'tehran',
    "brief" TEXT NOT NULL,
    "reference_link" TEXT,
    "service_details" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "preferred_call_time" TEXT,
    "budget" TEXT,
    "admin_notes" TEXT,
    "booking_route" TEXT NOT NULL DEFAULT 'meeting_request',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "financial_model" TEXT NOT NULL DEFAULT '45_45_10_split',
    "user_id" TEXT,
    "expert_id" TEXT,
    CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "projects_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "experts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "otp_send_logs_phone_sent_at_idx" ON "otp_send_logs"("phone", "sent_at");

-- CreateIndex
CREATE INDEX "projects_created_at_idx" ON "projects"("created_at");
