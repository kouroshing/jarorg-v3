import http from "http";

async function verifyStep2() {
  const cookie = await new Promise((resolve, reject) => {
    http.get("http://localhost:3000/api/auth/dev-admin-login", (res) => {
      const setCookies = res.headers["set-cookie"];
      if (!setCookies) return reject(new Error("No cookie"));
      const jarSession = setCookies.find((c) => c.startsWith("jar_session="));
      resolve(jarSession ? jarSession.split(";")[0] : setCookies[0].split(";")[0]);
    }).on("error", reject);
  });

  const checkModels = ["User", "Order", "SpecialistProfile", "PortfolioItem", "AuditLog"];

  for (const model of checkModels) {
    await new Promise((resolve) => {
      const req = http.request(
        {
          hostname: "localhost",
          port: 3000,
          path: `/admin/${model}`,
          method: "GET",
          headers: { Cookie: cookie },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            const thMatches = body.match(/<th[^>]*>.*?<\/th>/g) || [];
            const headers = thMatches
              .map((th) => th.replace(/<[^>]+>/g, "").trim())
              .filter(Boolean);
            const hasId = headers.some((h) => h === "شناسه" || h === "شناسه کاربر" || h === "شناسه سفارش" || h.toLowerCase() === "id");
            console.log(`\n[${model}] Status: ${res.statusCode}`);
            console.log(`Headers (${headers.length}):`, headers);
            console.log(`Has ID in list columns? ${hasId ? "YES (FAIL)" : "NO (PASS ✅)"}`);
            resolve();
          });
        }
      );
      req.on("error", console.error);
      req.end();
    });
  }
}

verifyStep2();
