import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = path.join(root, "scripts/schedule-browser-fixture");
const server = spawn(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "--config", path.join(fixture, "vite.config.mts")], { cwd: root, stdio: "ignore" });
let browser;
try {
  let address;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw Error(`Vite exited ${server.exitCode}`);
    try { address = await fetch("http://127.0.0.1:5173/"); if (address.ok) break; } catch {}
    await delay(100);
  }
  assert.ok(address?.ok, "Vite fixture did not start within 10 seconds");
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_BIN || "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  for (const width of [1366, 390]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 844 });
    page.on("pageerror", (error) => { throw error; });
    await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle0" });
    await page.waitForFunction(() => document.body.innerText.includes("Schedule Workspace"));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, `${width}px layout has horizontal overflow`);
    assert.ok(await page.evaluate(() => [...document.querySelectorAll("button")].some((button) => button.textContent?.includes("Talk formats"))), "Workspace views missing");
    {
      await page.evaluate(() => [...document.querySelectorAll("button")].find((button) => button.textContent?.includes("New Session"))?.click());
      const search = 'input[aria-label="Search speaker directory"]';
      await page.waitForSelector(search);
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]')?.getAnimations().some((animation) => animation.playState === "running"));
      const dialogFits = await page.$eval('[role="dialog"]', (dialog) => ({
        horizontal: dialog.scrollWidth <= dialog.clientWidth,
        left: dialog.getBoundingClientRect().left,
        right: dialog.getBoundingClientRect().right,
      }));
      assert.ok(dialogFits.horizontal && dialogFits.left >= 0 && dialogFits.right <= width,
        `${width}px editor exceeds viewport or has horizontal overflow: ${JSON.stringify(dialogFits)}`);
      await page.$eval(search, (input) => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; setter.call(input, "Arief"); input.dispatchEvent(new Event("input", { bubbles: true })); });
      await page.waitForFunction(() => document.body.innerText.includes("Arief Nugraha"));
      assert.equal(await page.$eval(search, (input) => input.value), "Arief", "Speaker search input did not retain text");
      await page.keyboard.press("Escape");
    }
    await page.close();
    console.log(`PASS viewport ${width}px: no horizontal overflow; workspace rendered`);
  }
  console.log("PASS browser schedule workspace smoke checks");
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await Promise.race([new Promise((resolve) => server.once("exit", resolve)), delay(2000).then(() => server.kill("SIGKILL"))]);
}
