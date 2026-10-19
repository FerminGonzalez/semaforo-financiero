// Despliegue a GitHub Pages (subruta /<repo>/). Requiere `gh` autenticado.
//
//   REPO=semaforo-financiero node scripts/deploy-gh-pages.mjs
//
// 1) crea un repo publico (si no existe),
// 2) construye con VITE_BASE=/$REPO/,
// 3) publica dist/ en la rama gh-pages,
// 4) activa GitHub Pages y reporta la URL.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const REPO = process.env.REPO ?? "semaforo-financiero";
const OWNER = process.env.OWNER ?? execSync("gh api user -q .login", { encoding: "utf8" }).trim();
const TOKEN = execSync("gh auth token", { encoding: "utf8" }).trim();
const GITHUB_URL = `https://x-access-token:${TOKEN}@github.com/${OWNER}/${REPO}.git`;
const SITE_URL = `https://${OWNER}.github.io/${REPO}/`;

const run = (cmd, cwd = ROOT, opts = {}) => execSync(cmd, { stdio: "inherit", cwd, ...opts });
const silent = (cmd, cwd = ROOT) => execSync(cmd, { encoding: "utf8", cwd });

function hasRepo() {
  try {
    silent(`gh repo view ${OWNER}/${REPO} --json name`);
    return true;
  } catch {
    return false;
  }
}

// 1. Repo publico
if (!hasRepo()) {
  console.log("Creando repo", `${OWNER}/${REPO}`);
  run(`gh repo create ${REPO} --public --description "Semáforo Financiero de Bolsillo"`);
}

// 2. Build con base de subruta
console.log("Construyendo con base", `/${REPO}/`);
run(`npx vite build`, ROOT, { env: { ...process.env, VITE_BASE: `/${REPO}/` } });

// 3. Publicar el codigo en main (deja el historial visible)
if (!existsSync(join(ROOT, ".git"))) run("git init -b main", ROOT);
silent('git config user.name "FerminGonzalez"', ROOT);
silent('git config user.email "fermin@users.noreply.github.com"', ROOT);
silent("git add -A", ROOT);
try {
  silent('git commit -m "MVP Semaforo Financiero de Bolsillo"', ROOT);
} catch {
  /* nada que commitear */
}
try {
  silent(`git remote get-url origin`, ROOT);
} catch {
  silent(`git remote add origin ${GITHUB_URL}`, ROOT);
}
run("git push -u origin main", ROOT);

// 4. gh-pages: rama limpia con solo el build
const TMP = `/tmp/opencode/ghp-${REPO}`;
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
cpSync(join(ROOT, "dist"), join(TMP, "site"), { recursive: true });
// GitHub Pages necesita un .nojekyll para no romper rutas con guion bajo
execSync("touch .nojekyll", { cwd: join(TMP, "site") });
run("git init -b gh-pages", TMP);
run("git add -A", TMP);
run(`git commit -m "deploy ${new Date().toISOString()}"`, TMP);
run(`git remote add origin ${GITHUB_URL}`, TMP);
run("git push -f origin gh-pages", TMP);

// 5. Activar Pages
try {
  silent(`gh api -X POST repos/${OWNER}/${REPO}/pages -f source[branch]=gh-pages -f source[path]=/`);
} catch (e) {
  console.log("Pages ya activado o aviso:", String((e && e.message) || e).split("\n")[0]);
}

console.log("\nDesplegado. URL (puede tardar 1-2 min en quedar disponible):");
console.log(SITE_URL);
