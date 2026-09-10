-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "display_name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "used_storage" REAL NOT NULL DEFAULT 0,
    "storage_limit" REAL NOT NULL DEFAULT 2147483648,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "onboarding_status" TEXT NOT NULL DEFAULT 'not_started',
    "specialist_roles" TEXT,
    "has_studio" BOOLEAN NOT NULL DEFAULT false,
    "studio_images" TEXT,
    "specialist_city" TEXT,
    "location_types" TEXT,
    "specialist_equipment" TEXT,
    "pricing_genres" TEXT,
    "has_100_days_masterclass" BOOLEAN NOT NULL DEFAULT false,
    "plan_id" TEXT,
    "plan_expires_at" DATETIME,
    "handle" TEXT,
    "requested_blue_tick" BOOLEAN NOT NULL DEFAULT false,
    "wallet_balance" INTEGER NOT NULL DEFAULT 0,
    "unseen_sales" INTEGER NOT NULL DEFAULT 0
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
    "attempts" INTEGER NOT NULL DEFAULT 0,
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
    "payment_status" TEXT NOT NULL DEFAULT 'FULL',
    "financial_model" TEXT NOT NULL DEFAULT '45_45_10_split',
    "google_drive_folder_id" TEXT,
    "total_size" REAL NOT NULL DEFAULT 0,
    "user_id" TEXT,
    "expert_id" TEXT,
    CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "projects_expert_id_fkey" FOREIGN KEY ("expert_id") REFERENCES "experts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "category_slug" TEXT NOT NULL,
    "category_title" TEXT,
    "is_flexible_schedule" BOOLEAN NOT NULL DEFAULT true,
    "booking_date" TEXT,
    "time_slot" TEXT,
    "duration_hours" INTEGER NOT NULL DEFAULT 2,
    "scheduled_at" DATETIME,
    "location_type" TEXT NOT NULL DEFAULT 'SPECIALIST_ADVICE',
    "location_address" TEXT,
    "district_or_city" TEXT,
    "location_lat" REAL,
    "location_lng" REAL,
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
    "admin_cancel_note" TEXT,
    "agreed_base_price" INTEGER,
    "agreed_travel_fee" INTEGER,
    "agreed_total_price" INTEGER,
    "commission_percent" INTEGER,
    "paid_at" DATETIME,
    "payment_authority" TEXT,
    "payment_ref_id" TEXT,
    "disputed_at" DATETIME,
    "dispute_reason" TEXT,
    "dispute_resolved_at" DATETIME,
    "dispute_resolution" TEXT,
    "client_reminded_at" DATETIME,
    "no_applicants_at" DATETIME,
    "delivered_at" DATETIME,
    "settled_at" DATETIME,
    "settled_amount" INTEGER,
    "contact_revealed_at" DATETIME,
    "revision_count" INTEGER NOT NULL DEFAULT 0,
    "revision_requested_at" DATETIME,
    "revision_note" TEXT,
    "user_id" TEXT,
    "selected_specialist_id" TEXT,
    CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "orders_selected_specialist_id_fkey" FOREIGN KEY ("selected_specialist_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_interests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "specialist_id" TEXT NOT NULL,
    "message" TEXT,
    "proposed_price" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "distance_km" REAL,
    "travel_fee" INTEGER,
    "travel_fee_override" INTEGER,
    "travel_fee_override_reason" TEXT,
    CONSTRAINT "project_interests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_interests_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "spotplayer_course_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" INTEGER,
    "authority" TEXT,
    "ref_id" TEXT,
    "license_key" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "purchases_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "discount_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "discount_percent" INTEGER NOT NULL,
    "max_amount" INTEGER,
    "target_plan" TEXT,
    "target_plan_id" TEXT,
    "target_phone" TEXT,
    "duration_months" INTEGER,
    "max_usage" INTEGER NOT NULL,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name_fa" TEXT NOT NULL,
    "price_3_months" INTEGER NOT NULL,
    "price_12_months" INTEGER NOT NULL,
    "features" TEXT NOT NULL,
    "max_storage" INTEGER NOT NULL DEFAULT 0,
    "monthly_tokens" INTEGER NOT NULL DEFAULT 10,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "pwa_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'system-config',
    "short_name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "app_icon" TEXT NOT NULL,
    "apple_touch_icon" TEXT NOT NULL,
    "theme_color" TEXT NOT NULL,
    "splash_background_color" TEXT NOT NULL,
    "show_ios_prompt" BOOLEAN NOT NULL DEFAULT true,
    "gallery_commission" INTEGER NOT NULL DEFAULT 0,
    "specialist_commission" INTEGER NOT NULL DEFAULT 20,
    "travel_free_radius_km" INTEGER NOT NULL DEFAULT 8,
    "travel_rate_per_km" INTEGER NOT NULL DEFAULT 0,
    "free_monthly_tokens" INTEGER NOT NULL DEFAULT 10,
    "token_cost_apply" INTEGER NOT NULL DEFAULT 1,
    "token_cost_dismiss" INTEGER NOT NULL DEFAULT 1,
    "no_applicant_timeout_hours" INTEGER NOT NULL DEFAULT 48,
    "selection_reminder_hours" INTEGER NOT NULL DEFAULT 72,
    "selection_timeout_days" INTEGER NOT NULL DEFAULT 7,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" DATETIME,
    "link" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "duration_months" INTEGER NOT NULL DEFAULT 3,
    "discount_code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "authority" TEXT NOT NULL,
    "ref_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transactions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "gallery_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "access_code" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "discount_threshold" INTEGER,
    "discounted_price" INTEGER,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "gallery_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "gallery_photos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "original_url" TEXT NOT NULL,
    "watermarked_url" TEXT,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gallery_photos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "gallery_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "gallery_purchases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "client_phone" TEXT NOT NULL,
    "purchased_photo_ids" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "authority" TEXT NOT NULL,
    "ref_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "gallery_purchases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "gallery_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "wallet_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "order_id" TEXT,
    "withdrawal_id" TEXT,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "shaba_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "tracking_code" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "withdrawal_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "specialist_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INCOMPLETE',
    "city" TEXT,
    "work_area" TEXT,
    "bio" TEXT,
    "equipment_summary" TEXT,
    "selected_categories" TEXT,
    "base_lat" REAL,
    "base_lng" REAL,
    "base_address" TEXT,
    "agreed_to_terms" BOOLEAN NOT NULL DEFAULT false,
    "terms_agreed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_for_review_at" DATETIME,
    "reviewed_at" DATETIME,
    "reviewed_by" TEXT,
    "review_note" TEXT,
    CONSTRAINT "specialist_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "portfolio_items" (
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

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "target_model" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_handle_key" ON "users"("handle");

-- CreateIndex
CREATE INDEX "otp_send_logs_phone_sent_at_idx" ON "otp_send_logs"("phone", "sent_at");

-- CreateIndex
CREATE INDEX "projects_created_at_idx" ON "projects"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_payment_authority_key" ON "orders"("payment_authority");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "project_interests_order_id_idx" ON "project_interests"("order_id");

-- CreateIndex
CREATE INDEX "project_interests_specialist_id_idx" ON "project_interests"("specialist_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_interests_order_id_specialist_id_key" ON "project_interests"("order_id", "specialist_id");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_authority_key" ON "purchases"("authority");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_user_id_course_id_key" ON "purchases"("user_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "discount_codes_code_key" ON "discount_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "plans_key_key" ON "plans"("key");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_slug_key" ON "notification_templates"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_authority_key" ON "transactions"("authority");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_projects_slug_key" ON "gallery_projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_projects_access_code_key" ON "gallery_projects"("access_code");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_purchases_authority_key" ON "gallery_purchases"("authority");

-- CreateIndex
CREATE INDEX "gallery_purchases_project_id_client_phone_idx" ON "gallery_purchases"("project_id", "client_phone");

-- CreateIndex
CREATE INDEX "wallet_entries_user_id_created_at_idx" ON "wallet_entries"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "specialist_profiles_user_id_key" ON "specialist_profiles"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_target_model_target_id_idx" ON "audit_logs"("target_model", "target_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

