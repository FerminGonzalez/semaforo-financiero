import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages publica en una subruta (/<repo>/). VITE_BASE permite sobrescribir
// la base sin tocar el resto; en local queda en "/".
const base = process.env.VITE_BASE ?? "/";

// PWA local-first: la app debe abrir y operar sin conexion (taller con poca senal).
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "ticket.svg"],
      manifest: {
        name: "Semaforo Financiero de Bolsillo",
        short_name: "Semaforo",
        description:
          "Convierte notas y tickets caoticos en un semaforo de flujo de caja y una regla de decision para manana. Funciona sin conexion.",
        lang: "es-MX",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "./",
        scope: "./",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: `${base}index.html`
      }
    })
  ],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true }
});
