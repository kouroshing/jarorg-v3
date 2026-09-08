import { spawn } from "child_process";
import fs from "fs";
import path from "path";

async function capture() {
  const chromeProcess = spawn(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    [
      "--headless=new",
      "--remote-debugging-port=9222",
      "--disable-gpu",
      "--no-sandbox",
      "--window-size=1440,1200",
      "--user-data-dir=/tmp/chrome-step2-scroll-" + Date.now(),
    ],
    { stdio: "ignore" }
  );

  await new Promise((r) => setTimeout(r, 2000));

  const artifactDir = "/Users/kouroshing/.gemini/antigravity/brain/a0fbaedd-9279-46a6-a587-71fee2c28a5d/.tempmediaStorage";

  try {
    const targetUrl = "http://localhost:3000/api/auth/dev-admin-login?redirect=/admin/SpecialistProfile/266d1057-d4fd-4bd1-b21d-13aaab8b9d78";
    console.log(`Navigating to: ${targetUrl}`);
    const res = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(targetUrl)}`, {
      method: "PUT",
    });
    const tab = await res.json();
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    await new Promise((resolve) => {
      ws.onopen = async () => {
        let msgId = 1;
        const send = (method, params = {}) =>
          new Promise((res) => {
            const id = msgId++;
            const handler = (event) => {
              const d = JSON.parse(event.data);
              if (d.id === id) {
                ws.removeEventListener("message", handler);
                res(d.result);
              }
            };
            ws.addEventListener("message", handler);
            ws.send(JSON.stringify({ id, method, params }));
          });

        await send("Page.enable");
        await send("Runtime.enable");

        // Wait 4s for render
        await new Promise((r) => setTimeout(r, 4000));

        // Scroll the widget into view
        await send("Runtime.evaluate", {
          expression: `
            (() => {
              const el = document.evaluate("//h4[contains(., 'بررسی و نظارت کیفی نمونه‌کارها')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
              if (el) {
                el.scrollIntoView({ behavior: 'instant', block: 'start' });
              }
            })()
          `,
        });

        await new Promise((r) => setTimeout(r, 1000));

        const shotRes = await send("Page.captureScreenshot", {
          format: "png",
        });

        if (shotRes?.data) {
          const outPath = path.join(artifactDir, "admin-specialist-review-widget-focused.png");
          fs.writeFileSync(outPath, Buffer.from(shotRes.data, "base64"));
          console.log(`Saved screenshot to: ${outPath}`);
        }

        ws.close();
        resolve();
      };
    });
  } catch (err) {
    console.error("Capture error:", err);
  } finally {
    chromeProcess.kill();
  }
}

capture();
