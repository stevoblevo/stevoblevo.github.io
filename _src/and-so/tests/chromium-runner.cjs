// Dependency-free CDP test runner, private temporary profile, no user browser connection.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const [url, width, height, screenshot] = process.argv.slice(2);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'andso-browser-'));
  const child = spawn(process.env.ANDSO_CHROMIUM || '/usr/lib/chromium/chromium', [
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--mute-audio',
    '--no-first-run', '--disable-background-networking', '--deny-permission-prompts',
    '--disable-crash-reporter', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'
  ], { stdio: 'ignore' });
  let ws;
  try {
    let endpoint;
    for (let i = 0; i < 100; i++) {
      try { const [port, route] = (await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).trim().split('\n'); endpoint = `ws://127.0.0.1:${port}${route}`; break; } catch (_) { await sleep(100); }
    }
    if (!endpoint) throw Error('Isolated Chromium did not start');
    ws = new WebSocket(endpoint); await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0; const pending = new Map();
    ws.onmessage = event => { const reply = JSON.parse(event.data), item = pending.get(reply.id); if (!item) return; pending.delete(reply.id); if (reply.error) item.reject(Error(reply.error.message)); else item.resolve(reply.result); };
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params, sessionId })); });
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const page = (method, params) => send(method, params, sessionId);
    await page('Emulation.setDeviceMetricsOverride', { width: +width, height: +height, deviceScaleFactor: 1, mobile: +width < 760 });
    await page('Page.navigate', { url });
    let result;
    for (let i = 0; i < 250; i++) {
      const response = await page('Runtime.evaluate', { expression: screenshot ? "document.getElementById('voiceCommands')?.dataset.visual" : "document.getElementById('qa-result')?.textContent", returnByValue: true });
      if (response.result.value) { result = response.result.value; break; }
      await sleep(100);
    }
    if (!result) throw Error('Timed out waiting for browser fixture');
    if (screenshot) { const shot = await page('Page.captureScreenshot', { format: 'png' }); await fs.writeFile(screenshot, Buffer.from(shot.data, 'base64')); console.log(JSON.stringify({ screenshot, viewport: [+width, +height] })); }
    else console.log(result);
    await send('Browser.close');
  } finally {
    ws?.close(); child.kill();
    await sleep(150);
    await fs.rm(profile, { recursive: true, force: true, maxRetries: 3 });
  }
})().catch(error => { console.error(String(error)); process.exitCode = 1; });
