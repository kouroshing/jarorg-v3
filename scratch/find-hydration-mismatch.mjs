import { spawn } from "child_process";

async function main() {
  const chromeProcess = spawn(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    [
      "--headless=new",
      "--remote-debugging-port=9222",
      "--disable-gpu",
      "--no-sandbox",
      "--user-data-dir=/tmp/chrome-debug-mismatch-" + Date.now(),
    ],
    { stdio: "ignore" }
  );

  await new Promise((r) => setTimeout(r, 1500));

  try {
    const res = await fetch("http://127.0.0.1:9222/json/new", { method: "PUT" });
    const tab = await res.json();
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
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

        // Add script to intercept console.error as early as possible
        await send("Page.addScriptToEvaluateOnNewDocument", {
          source: `
            const origError = console.error;
            console.error = function(...args) {
              const str = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
              if (str.includes('did not match') || str.includes('Text content') || str.includes('Hydration') || str.includes('Warning')) {
                window.__HYDRATION_ERRORS = window.__HYDRATION_ERRORS || [];
                window.__HYDRATION_ERRORS.push(args);
              }
              return origError.apply(this, args);
            };
          `,
        });

        // Navigate to login then user
        await send("Page.navigate", {
          url: "http://localhost:3000/api/auth/dev-admin-login?redirect=/admin/user",
        });

        // Wait 5s
        await new Promise((r) => setTimeout(r, 5000));

        const result = await send("Runtime.evaluate", {
          expression: `JSON.stringify(window.__HYDRATION_ERRORS || [], null, 2)`,
          returnByValue: true,
        });

        console.log("Captured Hydration Details:");
        console.log(result.result.value);

        resolve();
      };
      ws.onerror = reject;
    });

    ws.close();
  } catch (err) {
    console.error("Error:", err);
  } finally {
    chromeProcess.kill();
  }
}

main();
