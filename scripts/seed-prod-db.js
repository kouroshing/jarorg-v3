const { PrismaClient } = require("@prisma/client");
const path = require("path");

const dbPath = path.resolve(__dirname, "../prisma/jar.db");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`,
    },
  },
});

async function main() {
  console.log("=== Inspecting Database Tables ===");
  const userCount = await prisma.user.count();
  const projectCount = await prisma.project.count();
  const purchaseCount = await prisma.purchase.count();
  const courseCount = await prisma.course.count();
  const pwaCount = await prisma.pwaSettings.count();

  console.log(`Users count: ${userCount}`);
  console.log(`Projects count: ${projectCount}`);
  console.log(`Purchases count: ${purchaseCount}`);
  console.log(`Courses count: ${courseCount}`);
  console.log(`PwaSettings count: ${pwaCount}`);

  console.log("\n=== Upserting Default Course ===");
  const course = await prisma.course.upsert({
    where: { slug: "photography-masterclass" },
    update: {
      title: "مسترکلاس ۱۰۰ روزه عکاسی",
      description:
        "دوره جامع و صفر تا صد عکاسی، نورپردازی خلاقانه، تدوین حرفه‌ای و فرمول جذب مشتریان بزرگ.",
      price: 9100000,
      image: "/jaramooz/billow-hero.webp",
    },
    create: {
      title: "مسترکلاس ۱۰۰ روزه عکاسی",
      slug: "photography-masterclass",
      description:
        "دوره جامع و صفر تا صد عکاسی، نورپردازی خلاقانه، تدوین حرفه‌ای و فرمول جذب مشتریان بزرگ.",
      price: 9100000,
      image: "/jaramooz/billow-hero.webp",
    },
  });
  console.log("Course upserted successfully:", {
    id: course.id,
    title: course.title,
    slug: course.slug,
    price: course.price,
  });

  console.log("\n=== Upserting Default PWA Settings ===");
  const pwa = await prisma.pwaSettings.upsert({
    where: { id: "system-config" },
    update: {},
    create: {
      id: "system-config",
      shortName: "جار",
      fullName: "جار | رزرو آنلاین عکاس",
      description: "ثبت سفارش عکاسی، فیلم‌برداری و خدمات بصری",
      appIcon: "/app-icon.png",
      appleTouchIcon: "/app-icon.png",
      themeColor: "#ffffff",
      splashBackgroundColor: "#ffffff",
      showIosPrompt: true,
    },
  });
  console.log("PWA Settings upserted successfully:", {
    id: pwa.id,
    fullName: pwa.fullName,
    shortName: pwa.shortName,
  });

  console.log("\n=== Final Table Counts ===");
  console.log("Final Users:", await prisma.user.count());
  console.log("Final Projects:", await prisma.project.count());
  console.log("Final Courses:", await prisma.course.count());
  console.log("Final PwaSettings:", await prisma.pwaSettings.count());
}

main()
  .catch((e) => {
    console.error("Error executing script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
