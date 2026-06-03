-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'USER',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `experts` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `image_url` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification_codes` (
    `phone` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`phone`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `service_type` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL DEFAULT 'tehran',
    `brief` VARCHAR(191) NOT NULL,
    `reference_link` VARCHAR(191) NULL,
    `service_details` VARCHAR(191) NULL,
    `contact_name` VARCHAR(191) NULL,
    `contact_phone` VARCHAR(191) NULL,
    `preferred_call_time` VARCHAR(191) NULL,
    `budget` VARCHAR(191) NULL,
    `admin_notes` VARCHAR(191) NULL,
    `booking_route` VARCHAR(191) NOT NULL DEFAULT 'meeting_request',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `financial_model` VARCHAR(191) NOT NULL DEFAULT '45_45_10_split',
    `user_id` VARCHAR(191) NULL,
    `expert_id` VARCHAR(191) NULL,

    INDEX `projects_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_expert_id_fkey` FOREIGN KEY (`expert_id`) REFERENCES `experts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

