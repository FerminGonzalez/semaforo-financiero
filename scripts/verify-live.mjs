// Verifica la URL publica desplegada: render, sin errores de consola, y sync real.
import { chromium } from "playwright";

const URL = process.env.URL ?? "https://fermingonzalez.github.io/semaforo-financiero/";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(URL, { waitUntil: "load" });
await page.waitForTimeout(2500); // deja que la app monte y sincronice

const status = await page.getByTestId("status-label").textContent().catch(() => null);
const cash = await page.getByTestId("cash-available").textContent().catch(() => null);
const syncPill = await page.getByTestId("sync-pill").textContent().catch(() => null);

console.log("status:", status);
console.log("cash:", cash);
console.log("sync pill:", syncPill);
console.log("console errors:", errors.length ? errors : "ninguno");
await browser.close();
