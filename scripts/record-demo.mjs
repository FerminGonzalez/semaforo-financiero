// Graba la demo con NARRACION integrada (subtitulos quemados en pantalla),
// sincronizada a cada click. No requiere voz en off ni audio.
//
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

  // Barra de narracion fija (sobre la tab bar).
  await page.evaluate(() => {
    const el = document.createElement("div");
    el.id = "narration";
    el.style.cssText =
      "position:fixed;left:0;right:0;bottom:88px;z-index:9999;background:rgba(6,12,28,.92);" +
      "color:#fff;padding:16px 18px;font:600 17px/1.45 system-ui,-apple-system,Segoe UI,Roboto;" +
      "text-align:center;letter-spacing:.2px;border-top:2px solid #60a5fa;" +
      "box-shadow:0 -6px 24px rgba(0,0,0,.55)";
    document.body.appendChild(el);
  });

  const caption = (text) => page.evaluate((t) => {
    const el = document.getElementById("narration");
    if (el) el.textContent = t;
  }, text);

  const t = (id) => page.getByTestId(id);
  const shot = (n) => page.screenshot({ path: resolve(OUT, n) });
  const wheel = (y) => page.mouse.wheel(0, y);

  // ---- BEAT 1: el problema -------------------------------------------------
  caption("Marcos tiene un taller mecánico.");
  await sleep(3000);
  caption("Ve entrar dinero todos los días…");
  await sleep(3000);
  caption("…pero no sabe por qué no le alcanza a fin de mes.");
  await sleep(3600);
  caption("No le faltan datos: le sobran tickets y libretas. Le falta poder LEERLOS.");
  await sleep(4000);
  await shot("shot-01-problema.png");

  // ---- BEAT 2: el dato dificil --------------------------------------------
  await t("tab-asesor").click();
  caption("Esto es lo que le entrega un contador: EBITDA, pasivo, razón circulante…");
  await sleep(4600);
  await t("view-expert").click();
  caption("El número es el mismo. La diferencia: ¿puede DECIDIR con él?");
  await sleep(4200);
  await t("view-plain").click();
  caption("Aquí, en su idioma, es una sola línea.");
  await sleep(3800);
  await wheel(400);
  await sleep(1200);
  await shot("shot-02-dato.png");
  await t("tab-hoy").click();
  await sleep(1500);

  // ---- BEAT 3: captura offline --------------------------------------------
  await context.setOffline(true);
  caption("Marcos está en el taller… sin señal.");
  await sleep(3600);
  await shot("shot-03-offline.png");
  await t("tab-capturar").click();
  caption("Habla como le hablaría a su ayudante.");
  await sleep(3600);
  await page.getByTestId("phrase-chip").first().click();
  await sleep(1600);
  await t("interpret-button").click();
  caption("La app lo convierte en movimientos, sin formularios.");
  await sleep(4600);
  await shot("shot-04-drafts.png");
  await t("save-button").click();
  caption("Todo se guarda en el teléfono. No espera a la red.");
  await sleep(4200);
  await shot("shot-05-guardado.png");

  // ---- BEAT 4: sincronizacion ---------------------------------------------
  await context.setOffline(false);
  caption("Cuando vuelve la señal, sincroniza solo.");
  await sleep(5200);
  await shot("shot-06-sync.png");
  await t("tab-hoy").click();
  await sleep(2500);

  // ---- BEAT 5: el resultado -----------------------------------------------
  await t("tab-diagnostico").click();
  caption("El resultado no es un reporte: es una regla de 10 segundos.");
  await sleep(5000);
  await shot("shot-07-regla.png");
  await wheel(500);
  await sleep(1200);
  await t("collect-job").first().click();
  caption("Cobra lo pendiente… y el semáforo cambia.");
  await sleep(3600);

  // ---- BEAT 6: cierre -----------------------------------------------------
  await t("tab-hoy").click();
  caption("Mañana, Marcos ya sabe qué hacer.");
  await sleep(3600);
  caption("Aprender algo útil… y sostener una acción.");
  await sleep(5200);
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
  console.log("Video con narracion escrito en:", target);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
