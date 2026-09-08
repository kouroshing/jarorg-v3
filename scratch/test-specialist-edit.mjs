import http from "http";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testSpecialistEdit() {
  const profile = await prisma.specialistProfile.findFirst();
  console.log("Found specialist profile:", profile ? profile.id : "None found");

  if (!profile) {
    console.log("Creating a test specialist profile...");
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log("No user found");
      return;
    }
    const newProfile = await prisma.specialistProfile.create({
      data: {
        userId: user.id,
        status: "PENDING_REVIEW",
        city: "تهران",
        workArea: "منطقه ۱ تا ۳",
      },
    });
    console.log("Created test profile:", newProfile.id);
  }

  const targetProfile = profile || (await prisma.specialistProfile.findFirst());
  if (!targetProfile) return;

  const cookie = await new Promise((resolve, reject) => {
    http.get("http://localhost:3000/api/auth/dev-admin-login", (res) => {
      const setCookies = res.headers["set-cookie"];
      if (!setCookies) return reject(new Error("No cookie"));
      const jarSession = setCookies.find((c) => c.startsWith("jar_session="));
      resolve(jarSession ? jarSession.split(";")[0] : setCookies[0].split(";")[0]);
    }).on("error", reject);
  });

  console.log(`\nTesting GET /admin/SpecialistProfile/${targetProfile.id} ...`);
  await new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: 3000,
        path: `/admin/SpecialistProfile/${targetProfile.id}`,
        method: "GET",
        headers: { Cookie: cookie },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          console.log(`Status: ${res.statusCode}`);
          const hasWidget = body.includes("بررسی و نظارت کیفی نمونه‌کارها");
          console.log(`Widget rendered in HTML? ${hasWidget ? "YES ✅" : "NO ❌"}`);
          resolve();
        });
      }
    );
    req.on("error", console.error);
    req.end();
  });
}

testSpecialistEdit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
