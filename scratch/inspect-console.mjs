import { spawn } from "child_process";

async function main() {
  const chromeProcess = spawn(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    [
      "--headless=new",
      "--remote-debugging-port=9222",
      "--disable-gpu",
      "--no-sandbox",
      "--user-data-dir=/tmp/chrome-debug-user-" + Date.now(),
    ],
    { stdio: "ignore" }
  );

  // Wait 1.5s for Chrome to bind port 9222
  await new Promise((r) => setTimeout(r, 1500));

  try {
    // Create new tab with login
    const targetUrl = "http://localhost:3000/api/auth/dev-admin-login?redirect=/admin/user";
    const res = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(targetUrl)}`, {
      method: "PUT",
    });
    const tab = await res.json();
    console.log("Opened tab:", tab.id, tab.webSocketDebuggerUrl);

    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    const logs = [];
    const errors = [];
    const networkErrors = [];

    await new Promise((resolve, reject) => {
      ws.onopen = () => {
        let msgId = 1;
        const send = (method, params = {}) => {
          ws.send(JSON.stringify({ id: msgId++, method, params }));
        };

        send("Page.enable");
        send("Runtime.enable");
        send("Log.enable");
        send("Network.enable");

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.method === "Runtime.consoleAPICalled") {
            const text = data.params.args.map((a) => a.value ?? a.description ?? JSON.stringify(a)).join(" ");
            logs.push(`[Console ${data.params.type}] ${text}`);
            if (data.params.type === "error") {
              errors.push(text);
            }
          }
          if (data.method === "Runtime.exceptionThrown") {
            const text = data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text;
            errors.push(`[Exception] ${text}`);
          }
          if (data.method === "Log.entryAdded") {
            if (data.params.entry.level === "error") {
              errors.push(`[Log Error] ${data.params.entry.text}`);
            }
          }
          if (data.method === "Network.loadingFailed") {
            networkErrors.push(`[Network Failed] ${data.params.errorText} for request ${data.params.requestId}`);
          }
          if (data.method === "Network.responseReceived") {
            if (data.params.response.status >= 400) {
              networkErrors.push(`[HTTP ${data.params.response.status}] ${data.params.response.url}`);
            }
          }
        };

        // Wait 5 seconds for page load, hydration and scripts
        setTimeout(() => {
          resolve();
        }, 5000);
      };
      ws.onerror = reject;
    });

    console.log("\n=== CAPTURED CONSOLE ERRORS ===");
    console.log(`Total errors: ${errors.length}`);
    errors.forEach((err, i) => console.log(`${i + 1}: ${err}`));

    console.log("\n=== CAPTURED NETWORK ERRORS ===");
    console.log(`Total network errors: ${networkErrors.length}`);
    networkErrors.forEach((err, i) => console.log(`${i + 1}: ${err}`));

    console.log("\n=== ALL RECENT CONSOLE LOGS ===");
    logs.slice(-20).forEach((l) => console.log(l));

    ws.close();
  } catch (err) {
    console.error("CDP inspection failed:", err);
  } finally {
    chromeProcess.kill();
  }
}

main();
