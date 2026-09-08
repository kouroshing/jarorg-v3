import { spawn } from "child_process";

async function main() {
  const chromeProcess = spawn(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    [
      "--headless=new",
      "--remote-debugging-port=9222",
      "--disable-gpu",
      "--no-sandbox",
      "--user-data-dir=/tmp/chrome-debug-detail-" + Date.now(),
    ],
    { stdio: "ignore" }
  );

  await new Promise((r) => setTimeout(r, 1500));

  try {
    const targetUrl = "http://localhost:3000/api/auth/dev-admin-login?redirect=/admin/user";
    const res = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(targetUrl)}`, {
      method: "PUT",
    });
    const tab = await res.json();
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = () => {
        let msgId = 1;
        const send = (method, params = {}) => {
          ws.send(JSON.stringify({ id: msgId++, method, params }));
        };

        send("Page.enable");
        send("Runtime.enable");
        send("Log.enable");

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.method === "Runtime.consoleAPICalled") {
            const fullArgs = data.params.args.map((a) => {
              if (a.type === "string") return a.value;
              return a.description || JSON.stringify(a);
            });
            console.log(`[CONSOLE ${data.params.type.toUpperCase()}]:`, fullArgs.join(" "));
          }
          if (data.method === "Runtime.exceptionThrown") {
            console.log("[EXCEPTION]:", data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
          }
        };

        setTimeout(() => {
          resolve();
        }, 6000);
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
