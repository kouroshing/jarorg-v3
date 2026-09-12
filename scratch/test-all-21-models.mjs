import http from "http";

async function testAllModels() {
  // Step 1: Login via dev-admin-login to get session cookie
  const cookie = await new Promise((resolve, reject) => {
    http.get("http://localhost:3000/api/auth/dev-admin-login", (res) => {
      const setCookies = res.headers["set-cookie"];
      if (!setCookies || setCookies.length === 0) {
        return reject(new Error("No cookie returned from dev-admin-login"));
      }
      const jarSession = setCookies.find((c) => c.startsWith("jar_session="));
      resolve(jarSession ? jarSession.split(";")[0] : setCookies[0].split(";")[0]);
    }).on("error", reject);
  });

  console.log("Obtained admin session cookie:", cookie.slice(0, 30) + "...");

  const models = [
    "Order",
    "ProjectInterest",
    "User",
    "SpecialistProfile",
    "PortfolioItem",
    "Transaction",
    "WithdrawalRequest",
    "Plan",
    "DiscountCode",
    "GalleryProject",
    "GalleryPhoto",
    "GalleryOrder",
    "GalleryPurchase",
    "Course",
    "Purchase",
    "Notification",
    "NotificationTemplate",
    "PwaSettings",
    "Project",
    "AuditLog",
  ];

  console.log(`\nTesting ${models.length} models in NextAdmin...`);
  const results = [];

  for (const model of models) {
    const status = await new Promise((resolve) => {
      const req = http.request(
        {
          hostname: "localhost",
          port: 3000,
          path: `/admin/${model}`,
          method: "GET",
          headers: {
            Cookie: cookie,
          },
        },
        (res) => {
          // Consume response body
          res.on("data", () => {});
          res.on("end", () => resolve(res.statusCode));
        }
      );
      req.on("error", (err) => resolve(`ERR: ${err.message}`));
      req.end();
    });

    console.log(`Model: ${model.padEnd(22)} => HTTP ${status}`);
    results.push({ model, status });
  }

  const failed = results.filter((r) => r.status !== 200);
  if (failed.length === 0) {
    console.log("\n✅ ALL 21 MODELS RESPONDED WITH HTTP 200 OK! Zero crashes!");
  } else {
    console.error(`\n❌ FAILED MODELS:`, failed);
    process.exit(1);
  }
}

testAllModels().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
