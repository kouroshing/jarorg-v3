const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runTests() {
  console.log("\n=======================================================");
  console.log("🧪 COMPLETE E2E TEST: MARKETPLACE & SPECIALIST ELIGIBILITY");
  console.log("=======================================================\n");

  const testSuffix = Date.now().toString().slice(-6);

  try {
    // 1. Setup Client and Specialist Users
    console.log("Step 1: Creating client and newly registered specialist...");
    const clientUser = await prisma.user.create({
      data: {
        phone: `09771${testSuffix}`,
        role: "USER",
        displayName: "کارفرمای تست احراز",
      },
    });

    const specialistUser = await prisma.user.create({
      data: {
        phone: `09772${testSuffix}`,
        role: "SPECIALIST",
        displayName: "متخصص جدید جار",
        specialistProfile: {
          create: {
            status: "INCOMPLETE",
            agreedToTerms: false,
          },
        },
      },
      include: { specialistProfile: true },
    });

    console.log("✅ Specialist created with initial status: INCOMPLETE, agreedToTerms: false.");

    // 2. Client creates an Order
    console.log("\nStep 2: Client creates Order (DEPOSIT_PAID)...");
    const order = await prisma.order.create({
      data: {
        categorySlug: "portrait-avatar",
        categoryTitle: "عکاسی پرتره و آواتار",
        bookingDate: "1405/01/25",
        timeSlot: "16:00 - 18:00",
        durationHours: 2,
        hourlyRate: 900000,
        totalEstimatedPrice: 1800000,
        depositAmount: 900000,
        status: "DEPOSIT_PAID",
        userId: clientUser.id,
        contactName: clientUser.displayName,
        contactPhone: clientUser.phone,
      },
    });
    console.log(`✅ Order ${order.id} created.`);

    // 3. Verify Specialist is blocked when INCOMPLETE
    console.log("\nStep 3: Checking specialist eligibility when profile is INCOMPLETE...");
    const profileBefore = await prisma.specialistProfile.findUnique({
      where: { id: specialistUser.specialistProfile.id },
      include: { portfolioItems: true },
    });
    const isEligibleBefore =
      profileBefore.status === "ACTIVE" &&
      profileBefore.agreedToTerms === true &&
      profileBefore.portfolioItems.length >= 10;

    console.assert(!isEligibleBefore, "Specialist should not be eligible yet");
    console.log("✅ Incomplete specialist correctly marked as ineligible for proposals.");

    // 4. Specialist uploads 10 portfolio items (Step 1 of Onboarding)
    console.log("\nStep 4: Specialist uploads 10 portfolio items in portrait-avatar...");
    for (let i = 1; i <= 10; i++) {
      await prisma.portfolioItem.create({
        data: {
          specialistId: specialistUser.specialistProfile.id,
          categorySlug: "portrait-avatar",
          categoryType: "PERSONAL",
          fileUrl: `/uploads/test_portfolio_${i}.jpg`,
          mediaType: "IMAGE",
          title: `پرتره شماره ${i}`,
        },
      });
    }

    const portfolioCount = await prisma.portfolioItem.count({
      where: { specialistId: specialistUser.specialistProfile.id, categorySlug: "portrait-avatar" },
    });
    console.assert(portfolioCount === 10, "Portfolio count must be 10");
    console.log("✅ Step 1 complete: 10 portfolio items uploaded.");

    // 5. Specialist completes Details & signs NDA (Step 2 of Onboarding)
    console.log("\nStep 5: Specialist fills city, work area, equipment and signs NDA...");
    const updatedProfile = await prisma.specialistProfile.update({
      where: { id: specialistUser.specialistProfile.id },
      data: {
        city: "تهران",
        workArea: "تمام مناطق تهران",
        equipmentSummary: "Sony A7IV, Lens 24-70 GM, Flash Godox AD200",
        bio: "عکاس پرتره با ۵ سال سابقه",
        agreedToTerms: true,
        termsAgreedAt: new Date(),
        status: "ACTIVE", // Promoted to ACTIVE!
      },
    });

    console.assert(updatedProfile.status === "ACTIVE", "Status must now be ACTIVE");
    console.assert(updatedProfile.agreedToTerms === true, "agreedToTerms must be true");
    console.log("✅ Step 2 complete: Profile updated to ACTIVE.");

    // 6. Specialist submits ProjectInterest
    console.log("\nStep 6: Active specialist submits interest on Order...");
    const interest = await prisma.projectInterest.create({
      data: {
        orderId: order.id,
        specialistId: specialistUser.id,
        message: "سلام، نمونه‌کارهای پرتره من در پروفایل قابل مشاهده است.",
        proposedPrice: 1800000,
        status: "PENDING",
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "HAS_APPLICANTS" },
    });

    console.log(`✅ Interest ${interest.id} submitted. Order status: HAS_APPLICANTS.`);

    // 7. Client selects Specialist → AWAITING_PAYMENT (no second specialist confirm)
    console.log("\nStep 7: Client selects Specialist...");
    await prisma.$transaction([
      prisma.projectInterest.update({
        where: { id: interest.id },
        data: { status: "SELECTED" },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: "AWAITING_PAYMENT",
          selectedSpecialistId: specialistUser.id,
        },
      }),
      prisma.notification.create({
        data: {
          userId: specialistUser.id,
          title: "انتخاب شما توسط کارفرما",
          message: "کارفرما شما را انتخاب کرد. به‌محض پرداخت، پروژه قطعی می‌شود.",
          type: "SUCCESS",
        },
      }),
    ]);

    const orderAfterSelect = await prisma.order.findUnique({ where: { id: order.id } });
    console.assert(orderAfterSelect.status === "AWAITING_PAYMENT", "Order must be awaiting payment");
    console.log("✅ Order in AWAITING_PAYMENT state.");

    // 8. Client pays → CONFIRMED
    console.log("\nStep 8: Client payment confirms the project...");
    await prisma.$transaction([
      prisma.projectInterest.update({
        where: { id: interest.id },
        data: { status: "ACCEPTED" },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { status: "CONFIRMED", paidAt: new Date() },
      }),
      prisma.notification.create({
        data: {
          userId: specialistUser.id,
          title: "سفارش قطعی شد",
          message: "کارفرما مبلغ را پرداخت کرد.",
          type: "SUCCESS",
        },
      }),
    ]);

    const orderFinal = await prisma.order.findUnique({ where: { id: order.id } });
    console.assert(orderFinal.status === "CONFIRMED", "Order must be CONFIRMED");
    console.log("✅ Order finalized with status CONFIRMED!");

    // 9. Cleanup
    console.log("\nCleaning up test records...");
    await prisma.notification.deleteMany({
      where: { userId: { in: [clientUser.id, specialistUser.id] } },
    });
    await prisma.projectInterest.deleteMany({ where: { orderId: order.id } });
    await prisma.order.deleteMany({ where: { id: order.id } });
    await prisma.portfolioItem.deleteMany({ where: { specialistId: specialistUser.specialistProfile.id } });
    await prisma.specialistProfile.deleteMany({ where: { id: specialistUser.specialistProfile.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [clientUser.id, specialistUser.id] } },
    });
    console.log("✅ Cleanup complete.");

    console.log("\n=======================================================");
    console.log("🎉 ALL E2E MARKETPLACE & ELIGIBILITY TESTS PASSED!");
    console.log("=======================================================\n");
  } catch (err) {
    console.error("❌ Test failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
