/**
 * One-off: wipe specialist profile + portfolio for phone containing 9100138383.
 * Keeps the User (admin) account intact.
 * Run on Liara: node /tmp/reset-specialist-test.js
 */
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const p = new PrismaClient();

function resolveUploadPath(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") return null;
  if (fileUrl.startsWith("/uploads/")) return path.join("/app/public", fileUrl);
  if (fileUrl.startsWith("uploads/")) return path.join("/app/public", fileUrl);
  return null;
}

(async () => {
  const users = await p.user.findMany({
    where: { phone: { contains: "9100138383" } },
    include: {
      specialistProfile: { include: { portfolioItems: true } },
    },
  });

  if (users.length === 0) {
    console.log("NO_USER");
    process.exit(0);
  }

  for (const u of users) {
    console.log("USER", u.id, u.phone, u.role);
    const sp = u.specialistProfile;
    if (!sp) {
      console.log("NO_SPECIALIST_PROFILE");
      continue;
    }

    let deletedFiles = 0;
    for (const item of sp.portfolioItems) {
      const fp = resolveUploadPath(item.fileUrl);
      if (fp && fs.existsSync(fp)) {
        try {
          fs.unlinkSync(fp);
          deletedFiles += 1;
        } catch (e) {
          console.log("FILE_DELETE_FAIL", fp, String(e));
        }
      }
    }
    const avatarPath = resolveUploadPath(sp.avatarUrl);
    if (avatarPath && fs.existsSync(avatarPath)) {
      try {
        fs.unlinkSync(avatarPath);
        deletedFiles += 1;
      } catch (_) {}
    }

    await p.portfolioItem.deleteMany({ where: { specialistId: sp.id } });
    await p.specialistProfile.delete({ where: { id: sp.id } });

    await p.user.update({
      where: { id: u.id },
      data: {
        onboardingStatus: "not_started",
        specialistRoles: null,
        city: null,
        equipment: null,
        locationTypes: null,
        pricingGenres: null,
      },
    });

    console.log(
      JSON.stringify({
        deletedProfile: sp.id,
        portfolioItems: sp.portfolioItems.length,
        deletedFiles,
        roleKept: u.role,
      })
    );
  }

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
