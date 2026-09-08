import { spawn } from "child_process";

async function main() {
  const chromeProcess = spawn(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    [
      "--headless=new",
      "--remote-debugging-port=9222",
      "--disable-gpu",
      "--no-sandbox",
      "--user-data-dir=/tmp/chrome-debug-detail-2-" + Date.now(),
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

        // Listen for all exceptions
        ws.onmessage = (event) => {
          const d = JSON.parse(event.data);
          if (d.method === "Runtime.exceptionThrown") {
            console.log("=== EXCEPTION THROWN ===");
            console.log(JSON.stringify(d.params.exceptionDetails, null, 2));
          }
        };

        // Navigate
        await send("Page.navigate", {
          url: "http://localhost:3000/api/auth/dev-admin-login?redirect=/admin/user",
        });

        await new Promise((r) => setTimeout(r, 5000));
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
