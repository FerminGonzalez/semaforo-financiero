import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(m.type() + ": " + m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR: " + String(e)));

await page.goto("http://localhost:4173", { waitUntil: "load" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "load" });

await page.getByTestId("tab-capturar").click();
await page.getByTestId("phrase-chip").first().click();
await page.getByTestId("interpret-button").click();
await page.waitForTimeout(300);
console.log("drafts antes de guardar:", await page.getByTestId("draft-item").count());

const btn = page.getByTestId("save-button");
console.log("save button visible:", await btn.isVisible());
await btn.click();
await page.waitForTimeout(500);
console.log("saved-confirm count:", await page.getByTestId("saved-confirmation").count());
console.log("drafts despues:", await page.getByTestId("draft-item").count());
console.log("transactions en store:", await page.evaluate(() => JSON.parse(localStorage.getItem("smf.state.v1")).transactions.length));
console.log("ERRORS:", errs.length ? errs : "ninguno");
await browser.close();
