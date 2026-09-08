import http from "http";

async function run() {
  const cookie = await new Promise((resolve, reject) => {
    http.get("http://localhost:3000/api/auth/dev-admin-login", (res) => {
      const setCookies = res.headers["set-cookie"];
      if (!setCookies) return reject(new Error("No cookie"));
      const jarSession = setCookies.find((c) => c.startsWith("jar_session="));
      resolve(jarSession ? jarSession.split(";")[0] : setCookies[0].split(";")[0]);
    }).on("error", reject);
  });

  for (const path of ["/admin/user", "/admin/User"]) {
    console.log(`\n--- Fetching ${path} ---`);
    await new Promise((resolve) => {
      const req = http.request(
        {
          hostname: "localhost",
          port: 3000,
          path,
          method: "GET",
          headers: { Cookie: cookie },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            console.log(`Status: ${res.statusCode}`);
            // Check headers in HTML
            const thMatches = body.match(/<th[^>]*>.*?<\/th>/g);
            console.log("TH headers found:", thMatches ? thMatches.length : 0);
            if (thMatches) {
              console.log(thMatches.slice(0, 10).map((th) => th.replace(/<[^>]+>/g, "").trim()).filter(Boolean));
            }
            // Check for error text in body
            const errorMatches = body.match(/error/gi);
            console.log("Occurrences of 'error':", errorMatches ? errorMatches.length : 0);
            resolve();
          });
        }
      );
      req.on("error", console.error);
      req.end();
    });
  }
}

run();
