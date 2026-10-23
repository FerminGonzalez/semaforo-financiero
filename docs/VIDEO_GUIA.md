# Video de demostración (narración ya integrada)

- **Archivo para subir:** `artifacts/demo-semaforo.mp4` (H.264, 390×844, **1:41**).
  - Ruta Windows: `C:\Users\Ghost\semaforo-financiero\artifacts\demo-semaforo.mp4`
- La **narración ya está integrada** como subtítulos/tarjetas de texto quemados en pantalla,
  sincronizados con cada click. **No necesitas grabar voz en off.**

## Estructura (coincide con el video)

| Tiempo aprox. | Beat | Subtítulo en pantalla |
| --- | --- | --- |
| 0:00–0:20 | Problema | "Marcos tiene un taller mecánico… ve entrar dinero, pero no sabe por qué no le alcanza." |
| 0:20–0:40 | El dato difícil | "Esto le entrega un contador: EBITDA, pasivo, razón circulante… el número es el mismo, ¿puede decidir con él?" |
| 0:40–1:10 | Captura offline | "Marcos está en el taller sin señal. Habla como le hablaría a su ayudante. La app lo convierte en movimientos." |
| 1:10–1:25 | Sincroniza | "Cuando vuelve la señal, sincroniza solo." |
| 1:25–1:41 | Resultado | "El resultado no es un reporte: es una regla de 10 segundos. Mañana, Marcos ya sabe qué hacer." |

## Cómo subirlo y verificar el acceso (obligatorio antes de entregar)

1. Sube `artifacts/demo-semaforo.mp4` a YouTube. En **Visibilidad**, elige **Oculto** o
   **Público** (evita "Privado", que exige permiso).
2. Copia el enlace.
3. Abre una **ventana de incógnito** y pega el enlace:
   - Debe reproducir **sin pedir inicio de sesión** ni permiso.
   - Confirma que la **duración ≤ 5:00** (este video es 1:41 ✓).

## Regenerar el video (si cambias algo de la app)

```bash
npm run build && npm run preview &   # o: npx vite preview --port 4173
node scripts/record-demo.mjs         # genera artifacts/demo-semaforo.webm
# y luego convierte:
ffmpeg -y -i artifacts/demo-semaforo.webm -c:v libx264 -preset slow -crf 20 \
  -pix_fmt yuv420p -movflags +faststart artifacts/demo-semaforo.mp4
```

> Los subtítulos se definen en `scripts/record-demo.mjs` (función `caption(...)`). Edita ahí
> los textos y sus tiempos para ajustar la narración.
