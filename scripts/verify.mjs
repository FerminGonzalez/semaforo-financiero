// Smoke test por DOM: confirma que la UI renderiza y que el semaforo evoluciona.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:4173";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(BASE, { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "load" });

const grab = async () => ({
  status: await page.getByTestId("status-label").textContent(),
  cash: await page.getByTestId("cash-available").textContent(),
  action: await page.getByTestId("action-text").textContent(),
  rule: await page.getByTestId("tomorrow-rule").textContent().catch(() => null)
});

console.log("INICIO:", JSON.stringify(await grab()));

// Asesor: expert vs plain
await page.getByTestId("tab-asesor").click();
console.log("jargon rows:", await page.getByTestId("jargon-row").count());
await page.getByTestId("view-expert").click();
const expert = await page.getByTestId("translation-expert").textContent();
console.log("EXPERT:", expert);
await page.getByTestId("view-plain").click();
console.log("PLAIN:", await page.getByTestId("translation-plain").textContent());

// Captura offline
await page.context().setOffline(true);
await page.getByTestId("tab-capturar").click();
console.log("offline banner:", await page.getByTestId("offline-banner").isVisible());
await page.getByTestId("phrase-chip").first().click();
await page.getByTestId("interpret-button").click();
await page.waitForTimeout(300);
console.log("drafts:", await page.getByTestId("draft-item").count());
console.log("draft1 amount:", await page.locator(".amount-input").first().inputValue());
await page.getByTestId("save-button").click();
await page.waitForTimeout(200);
console.log("saved:", (await page.getByTestId("saved-confirmation").textContent()).trim());

await page.context().setOffline(false);
await page.waitForTimeout(1500);
await page.getByTestId("tab-diagnostico").click();
console.log("REGLA:", await page.getByTestId("tomorrow-rule").textContent());
await page.getByTestId("collect-job").first().click();
await page.getByTestId("tab-hoy").click();
console.log("FINAL:", JSON.stringify(await grab()));

console.log("console errors:", errors.length ? errors : "ninguno");
await browser.close();
