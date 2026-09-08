import { spawn } from "child_process";

async function main() {
  const chromeProcess = spawn(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    [
      "--headless=new",
      "--remote-debugging-port=9222",
      "--disable-gpu",
      "--no-sandbox",
      "--user-data-dir=/tmp/chrome-debug-detail-3-" + Date.now(),
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
        await send("Debugger.enable");
        await send("Runtime.enable");

        // Set pause on uncaught exceptions
        await send("Debugger.setPauseOnExceptions", { state: "uncaught" });

        ws.onmessage = async (event) => {
          const d = JSON.parse(event.data);
          if (d.method === "Debugger.paused") {
            const callFrames = d.params.callFrames;
            console.log("=== DEBUGGER PAUSED ===");
            console.log("Reason:", d.params.reason);
            for (const frame of callFrames.slice(0, 5)) {
              console.log(`- ${frame.functionName} (${frame.url}:${frame.lineNumber})`);
              for (const scope of frame.scopeChain) {
                if (scope.type === "local") {
                  const scopeRes = await send("Runtime.getProperties", {
                    objectId: scope.object.objectId,
                  });
                  console.log("  Local variables:", scopeRes.result.map((p) => `${p.name}=${p.value?.value ?? p.value?.description}`).join(", "));
                }
              }
            }
            await send("Debugger.resume");
          }
        };

        await send("Page.navigate", {
          url: "http://localhost:3000/api/auth/dev-admin-login?redirect=/admin/user",
        });

        await new Promise((r) => setTimeout(r, 6000));
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
