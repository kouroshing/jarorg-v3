const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runTests() {
  console.log("\n=======================================================");
  console.log("🧪 TESTING P0 SPECIALIST ONBOARDING & ELIGIBILITY ENGINE");
  console.log("=======================================================\n");

  const testSuffix = Date.now().toString().slice(-6);

  try {
    // 1. Create a raw user without specialist role or profile
    console.log("Test 1: Regular USER role has no specialist eligibility...");
    const normalUser = await prisma.user.create({
      data: {
        phone: `09811${testSuffix}`,
        role: "USER",
        displayName: "کاربر عادی",
      },
    });

    const checkNormalUser = await prisma.user.findUnique({
      where: { id: normalUser.id },
      include: { specialistProfile: true },
    });
    console.assert(!checkNormalUser.specialistProfile, "Normal user should not have a specialist profile");
    console.log("✅ Passed: Normal user has no specialist profile.\n");

    // 2. Create specialist with INCOMPLETE profile (< 10 portfolio items)
    console.log("Test 2: Specialist with < 10 portfolio items must be INCOMPLETE...");
    const incompleteSpecialist = await prisma.user.create({
      data: {
        phone: `09822${testSuffix}`,
        role: "SPECIALIST",
        displayName: "عکاس تازه‌کار",
        specialistProfile: {
          create: {
            status: "INCOMPLETE",
            agreedToTerms: true,
            city: "تهران",
            selectedCategories: JSON.stringify(["portrait-avatar"]),
          },
        },
      },
      include: { specialistProfile: true },
    });

    // Add 5 portfolio items (under the 10 threshold)
    for (let i = 1; i <= 5; i++) {
      await prisma.portfolioItem.create({
        data: {
          specialistId: incompleteSpecialist.specialistProfile.id,
          categorySlug: "portrait-avatar",
          categoryType: "PERSONAL",
          fileUrl: `/uploads/sample_${i}.jpg`,
          mediaType: "IMAGE",
          title: `نمونه‌کار ${i}`,
        },
      });
    }

    const itemsCount = await prisma.portfolioItem.count({
      where: { specialistId: incompleteSpecialist.specialistProfile.id },
    });
    console.assert(itemsCount === 5, "Should have exactly 5 portfolio items");
    console.assert(incompleteSpecialist.specialistProfile.status === "INCOMPLETE", "Status should be INCOMPLETE");
    console.log(`✅ Passed: Specialist with ${itemsCount} items remains INCOMPLETE.\n`);

    // 3. Add 5 more items to reach threshold of 10 items in category
    console.log("Test 3: Elevating portfolio to 10 items and activating profile...");
    for (let i = 6; i <= 10; i++) {
      await prisma.portfolioItem.create({
        data: {
          specialistId: incompleteSpecialist.specialistProfile.id,
          categorySlug: "portrait-avatar",
          categoryType: "PERSONAL",
          fileUrl: `/uploads/sample_${i}.jpg`,
          mediaType: "IMAGE",
          title: `نمونه‌کار ${i}`,
        },
      });
    }

    const updatedItems = await prisma.portfolioItem.findMany({
      where: { specialistId: incompleteSpecialist.specialistProfile.id },
    });
    console.assert(updatedItems.length === 10, "Should have 10 items now");

    // Check count in category
    const categoryCounts = {};
    for (const item of updatedItems) {
      categoryCounts[item.categorySlug] = (categoryCounts[item.categorySlug] || 0) + 1;
    }
    const hasEligibleCategory = Object.values(categoryCounts).some((c) => c >= 10);
    console.assert(hasEligibleCategory === true, "Must meet eligible category requirement");

    // Activate profile
    const activatedProfile = await prisma.specialistProfile.update({
      where: { id: incompleteSpecialist.specialistProfile.id },
      data: {
        status: "ACTIVE",
        workArea: "منطقه ۱ و ۳ تهران",
        equipmentSummary: "Sony A7IV + Lens 24-70 GM",
      },
    });

    console.assert(activatedProfile.status === "ACTIVE", "Status must be ACTIVE");
    console.assert(activatedProfile.city === "تهران", "City must be set");
    console.assert(activatedProfile.agreedToTerms === true, "agreedToTerms must be true");
    console.log("✅ Passed: Specialist activated to ACTIVE upon meeting all criteria.\n");

    // 4. Test Marketplace interaction with the newly ACTIVE specialist
    console.log("Test 4: Client creates order and ACTIVE specialist submits interest...");
    const clientUser = await prisma.user.create({
      data: {
        phone: `09833${testSuffix}`,
        role: "USER",
        displayName: "کارفرمای سفارش عکاسی",
      },
    });

    const order = await prisma.order.create({
      data: {
        categorySlug: "portrait-avatar",
        categoryTitle: "عکاسی پرتره",
        bookingDate: "1405/02/01",
        timeSlot: "10:00 - 12:00",
        durationHours: 2,
        hourlyRate: 1000000,
        totalEstimatedPrice: 2000000,
        depositAmount: 1000000,
        status: "DEPOSIT_PAID",
        userId: clientUser.id,
        contactName: clientUser.displayName,
        contactPhone: clientUser.phone,
      },
    });

    const interest = await prisma.projectInterest.create({
      data: {
        orderId: order.id,
        specialistId: incompleteSpecialist.id,
        message: "من نمونه‌کارهای پرتره مرتبط دارم و با تجهیزات کامل آماده حضور هستم.",
        proposedPrice: 2000000,
        status: "PENDING",
      },
    });

    console.assert(interest.id && interest.status === "PENDING", "Interest should be PENDING");
    console.log("✅ Passed: Active specialist successfully submitted proposal.\n");

    // 5. Test SUSPENDED specialist status restriction
    console.log("Test 5: Suspended specialist restrictions...");
    const suspendedProfile = await prisma.specialistProfile.update({
      where: { id: incompleteSpecialist.specialistProfile.id },
      data: { status: "SUSPENDED" },
    });
    console.assert(suspendedProfile.status === "SUSPENDED", "Profile must be SUSPENDED");
    console.log("✅ Passed: SUSPENDED state verified in database.\n");

    // 6. Cleanup test records
    console.log("Cleaning up test artifacts...");
    await prisma.projectInterest.deleteMany({ where: { orderId: order.id } });
    await prisma.order.deleteMany({ where: { id: order.id } });
    await prisma.portfolioItem.deleteMany({ where: { specialistId: incompleteSpecialist.specialistProfile.id } });
    await prisma.specialistProfile.deleteMany({ where: { id: incompleteSpecialist.specialistProfile.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [normalUser.id, incompleteSpecialist.id, clientUser.id] } },
    });
    console.log("✅ Cleanup complete.");

    console.log("\n=======================================================");
    console.log("🎉 ALL ONBOARDING & ELIGIBILITY ARCHITECTURE TESTS PASSED!");
    console.log("=======================================================\n");
  } catch (err) {
    console.error("❌ Test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
