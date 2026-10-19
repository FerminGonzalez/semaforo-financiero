// Graba la demo del recorrido principal a video WebM (<=5 min) para subir a
// YouTube. Ejecuta contra el servidor de preview:
//   npm run build && npm run preview &   (o)  npx vite preview --port 4173
//   node scripts/record-demo.mjs
import { chromium } from "playwright";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../artifacts");
mkdirSync(OUT, { recursive: true });

const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const VIEW = { width: 390, height: 844 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  for (const f of readdirSync(OUT)) if (f.endsWith(".webm")) rmSync(resolve(OUT, f));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEW,
    deviceScaleFactor: 2,
    locale: "es-MX",
    recordVideo: { dir: OUT, size: VIEW }
  });
  const page = await context.newPage();

  await page.goto(BASE, { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });

  const t = (id) => page.getByTestId(id);
  const shot = (n) => page.screenshot({ path: resolve(OUT, n) });
  const wheel = (y) => page.mouse.wheel(0, y);

  // 0:00-0:40  El semaforo de hoy (el problema)
  await sleep(6000);
  await shot("shot-01-semaforo.png");

  // 0:40-1:30  El mismo dato, dos idiomas (contraste contador vs Marcos)
  await t("tab-asesor").click();
  await sleep(3500);
  await t("view-expert").click();
  await sleep(6000); // solo numeros
  await t("view-plain").click();
  await sleep(6000); // traducido
  await wheel(400);
  await sleep(1500);
  await shot("shot-02-asesor.png");
  await t("tab-hoy").click();
  await sleep(2500);

  // 1:30-2:40  Captura OFFLINE (senal intermitente)
  await context.setOffline(true);
  await sleep(4000); // banner "Sin senal"
  await shot("shot-03-offline-banner.png");
  await t("tab-capturar").click();
  await sleep(3500);
  await page.getByTestId("phrase-chip").first().click();
  await sleep(2500);
  await t("interpret-button").click();
  await sleep(5000); // jerga -> movimientos revisables
  await shot("shot-04-drafts.png");
  await t("save-button").click();
  await sleep(5000); // "guardado en el telefono"
  await shot("shot-05-saved-offline.png");

  // 2:40-3:15  Vuelve la senal: sincroniza
  await context.setOffline(false);
  await sleep(6000); // sync -> "Sincronizado"
  await shot("shot-06-sync.png");
  await t("tab-hoy").click();
  await sleep(4000);

  // 3:15-4:00  Resultado: regla para manana + cobrar pendiente
  await t("tab-diagnostico").click();
  await sleep(6000);
  await shot("shot-07-regla.png");
  await wheel(500);
  await sleep(2000);
  await t("collect-job").first().click();
  await sleep(4000);

  // Cierre: semaforo actualizado
  await t("tab-hoy").click();
  await sleep(8000);
  await shot("shot-08-final.png");

  await context.close();
  await browser.close();

  const vids = readdirSync(OUT).filter((f) => f.endsWith(".webm"));
  if (vids.length === 0) {
    console.error("No se genero video.");
    process.exit(1);
  }
  const target = resolve(OUT, "demo-semaforo.webm");
  renameSync(resolve(OUT, vids[0]), target);
  console.log("Video escrito en:", target);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
