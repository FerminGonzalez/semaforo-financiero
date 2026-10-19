# Semáforo Financiero de Bolsillo 🚦

> Convierte notas, tickets y audios caóticos en un **semáforo de flujo de caja** y una
> **regla de decisión para mañana** — en 3 minutos, sin contabilidad y sin conexión.

MVP presentado para el reto B2C *"interpretar una situación personal, aprender algo útil y
sostener una acción"*, aplicando la lente de **baja fricción** (poco tiempo, conectividad
intermitente, dato difícil de interpretar).

---

## 1. Problema concreto y persona usuaria

**Marcos, 38.** Dueño de un taller mecánico de barrio. Trabaja 10 horas al día con las manos
ocupadas, suele quedarse sin señal dentro del taller y solo tiene **3–5 minutos al final del
día** para revisar sus cuentas.

Su dolor: *trabaja sin parar y ve entrar dinero, pero a fin de mes no sabe por qué nunca le
alcanza para comprar herramienta o pagar a tiempo a los proveedores.*

El problema no es la falta de datos (tiene tickets, fotos y libretas), sino **la distancia
entre el dato que un contador lee fácil y la decisión que Marcos puede tomar hoy**.

## 2. Referencia verificable de la necesidad

Ver [`docs/REFERENCIAS.md`](docs/REFERENCIAS.md). Resumen:

- **INEGI** (Demografía de los Negocios 1989–2019): la esperanza de vida de un establecimiento
  al nacer es de **8.4 años**; la mortalidad se concentra en los primeros años.
- **CAF (2026)** y el estudio **Small Firm Diaries**: **37.7% de las microempresas mezcla la
  cuenta del negocio con la personal** (no sabe cuánto gana realmente); la **volatilidad del
  flujo de caja es estructural** en el segmento; el hábito de registrar toma 3–6 meses.
- **Redalyc (2021)**: en las microempresas prevalece una **"contabilidad intuitiva"** sin
  causación: el dueño calcula su utilidad por el efectivo que ve hoy, sin descontar los
  desembolsos futuros.

## 3. Recorrido principal (completable de inicio a fin)

1. **Captura en 1 minuto** — Marcos dicta o pega una frase (`"Le cobré $800 a Juan por el cambio
   de aceite y gasté $300 en refacciones"`) o adjunta la foto de un ticket. Funciona **sin red**:
   el parser de jerga corre 100% en el dispositivo.
2. **Traducción** — el texto se convierte en movimientos confirmables (ingreso/gasto, monto,
   categoría, cliente). Sin `EBITDA` ni `pasivo corriente`.
3. **Interpretación** — el semáforo compara lo cobrado hoy contra los pagos fijos de la semana y
   emite una alerta en lenguaje humano.
4. **Resultado reconocible** — una **"regla para mañana"** de 10 segundos que cambia la conducta
   del día siguiente.
5. **Sincronización** — cuando vuelve la señal, sube a Supabase solo.

## 4. Cómo ejecutarlo

```bash
npm install
cp .env.example .env        # pega tus credenciales publicas de Supabase (opcional)
npm run dev                 # http://localhost:5173
```

Sin `.env`, la app corre 100% local (offline). Para pruebas:

```bash
npm test                    # vitest (parser + insights)
npm run build && npm run preview   # build de produccion + PWA en :4173
```

## 5. Arquitectura

- **Local-first**: `src/lib/store.ts` persiste en `localStorage`; la captura nunca espera a la red.
- **Parser de jerga**: `src/lib/parser.ts` (montos por extenso, separadores es-MX, verbos de
  ingreso/gasto, detección de cliente y categoría) — sin dependencia de la nube.
- **Decisiones**: `src/lib/insights.ts` (semáforo, alerta de flujo, regla para mañana, y la tabla
  "mismo dato, dos idiomas").
- **Sync opcional**: `src/lib/cloud.ts` + Supabase (tabla `smf_transactions`, RLS demo).
- **PWA**: `vite-plugin-pwa` (service worker + manifest) para abrir sin señal.

## 6. Demostración en video

- Video: `artifacts/demo-semaforo.webm` (≤ 5 min), grabado automáticamente con Playwright.
- Guía de narración minuto a minuto e instrucciones de subida/verificación: [`docs/VIDEO_GUIA.md`](docs/VIDEO_GUIA.md).

## 7. Despliegue

```bash
REPO=semaforo-financiero node scripts/deploy-gh-pages.mjs   # requiere `gh` autenticado
```

Publica el build en GitHub Pages (`https://<usuario>.github.io/semaforo-financiero/`).

> ⚠️ Seguridad: la política RLS `smf_demo_anon_rw` es **solo para la demo** (permite todo a
> `anon`). Para producción se debe pasar a autenticación real y RLS por `device_id`/usuario.

## Estructura

```
src/
  lib/            parser, insights, store, cloud, connectivity, types
  components/     Semaforo, Captura, Diagnostico, Asesor, ui
scripts/          make-icons, migrate, verify, record-demo, deploy-gh-pages
docs/             REFERENCIAS.md, VIDEO_GUIA.md
```
