-- CreateTable
CREATE TABLE "jar_location_page_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "hero_title" TEXT NOT NULL DEFAULT 'جار لوکیشن',
    "hero_subtitle" TEXT NOT NULL DEFAULT 'فضا، عمارت و خیابان — جایی که نور درست می‌افتد.',
    "hero_image_url" TEXT NOT NULL DEFAULT '/images/jar-locations/hero.jpg',
    "all_chip_image_url" TEXT NOT NULL DEFAULT '/images/jar-locations/hero.jpg',
    "free_chip_image_url" TEXT NOT NULL DEFAULT '/images/jar-locations/free.jpg',
    "category_images" TEXT NOT NULL DEFAULT '{}',
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
