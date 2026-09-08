import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  const profile = await prisma.specialistProfile.findFirst({
    include: {
      portfolioItems: true,
      user: true,
    },
  });

  console.log("Specialist profile ID:", profile?.id);
  console.log("User:", profile?.user?.displayName, profile?.user?.phone);
  console.log("Portfolio items count:", profile?.portfolioItems?.length);

  if (profile && profile.portfolioItems.length === 0) {
    console.log("Creating 2 sample portfolio items for visual testing...");
    await prisma.portfolioItem.createMany({
      data: [
        {
          specialistId: profile.id,
          categorySlug: "portrait-avatar",
          categoryType: "COMMERCIAL",
          fileUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
          mediaType: "IMAGE",
          title: "پرتره تجاری شرکتی",
          caption: "عکاسی پرتره با نورپردازی رامبراند در استودیو",
          reviewStatus: "PENDING",
        },
        {
          specialistId: profile.id,
          categorySlug: "product-industrial",
          categoryType: "COMMERCIAL",
          fileUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
          mediaType: "IMAGE",
          title: "عکاسی صنعتی محصول ساعت مچی",
          caption: "عکاسی ماکرو با نور سفید استودیویی و پس‌زمینه خنثی",
          reviewStatus: "APPROVED",
        },
      ],
    });
    console.log("Created sample portfolio items!");
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
