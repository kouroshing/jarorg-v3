import { spawn } from "child_process";

async function main() {
  const chromeProcess = spawn(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    [
      "--headless=new",
      "--remote-debugging-port=9222",
      "--disable-gpu",
      "--no-sandbox",
      "--user-data-dir=/tmp/chrome-debug-err-" + Date.now(),
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

        // Evaluate in page to find nextjs-portal and error texts
        const evalRes = await send("Runtime.evaluate", {
          expression: `
            (() => {
              // 1. Check nextjs-portal
              const portal = document.querySelector('nextjs-portal');
              let overlayText = '';
              if (portal && portal.shadowRoot) {
                overlayText = portal.shadowRoot.innerText || '';
              }

              // 2. Check window.__NEXT_DATA__
              return {
                overlayText,
                title: document.title,
                thList: Array.from(document.querySelectorAll('th')).map(th => th.innerText.trim()),
                bodyTextSample: document.body.innerText.slice(0, 500)
              };
            })()
          `,
          returnByValue: true,
        });

        console.log("Overlay / Page Evaluation Result:", JSON.stringify(evalRes.result.value, null, 2));

        // Click the error badge to open the overlay if present
        const openBadgeRes = await send("Runtime.evaluate", {
          expression: `
            (() => {
              const portal = document.querySelector('nextjs-portal');
              if (portal && portal.shadowRoot) {
                const btn = portal.shadowRoot.querySelector('button, [data-nextjs-toast]');
                if (btn) btn.click();
                return portal.shadowRoot.innerHTML;
              }
              return 'no shadow root';
            })()
          `,
          returnByValue: true,
        });

        await new Promise((r) => setTimeout(r, 1000));

        const fullErrors = await send("Runtime.evaluate", {
          expression: `
            (() => {
              const portal = document.querySelector('nextjs-portal');
              if (portal && portal.shadowRoot) {
                return portal.shadowRoot.innerText;
              }
              return '';
            })()
          `,
          returnByValue: true,
        });

        console.log("\n=== FULL OVERLAY TEXT ===");
        console.log(fullErrors.result.value);

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
