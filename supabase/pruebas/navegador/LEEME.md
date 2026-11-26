# Pruebas con navegador (solo proyecto de PRUEBAS)

Recorren el sitio como una persona real con Chrome automatizado.

Preparación (una vez, fuera del proyecto):

    mkdir -p /tmp/e2e && cd /tmp/e2e && npm init -y && npm install playwright-core@1.48.2

Antes: sitio en local contra pruebas en http://localhost:3931 y haber corrido
`aislamiento.py` y `plataforma.py` (crean las ligas y usuarios de prueba).

Orden (cada script imprime ✅/❌):

1. `crear.js` → equipos, jugadores y partido en /liga-nueva (CORREO, CLAVE).
2. `planilla-jugar.js` → anota y finaliza el partido (8-5).
3. `publico.js` → 9 páginas públicas (PARTIDO=<id del partido>).
4. `jugador-lista.js` → equipo nuevo y jugador elegido de la lista.
5. `fase4.js` → primeros pasos y temporadas (CORREO_ADMIN/CLAVE_ADMIN, CORREO_OTRO/CLAVE_OTRO).
6. `temporadas.js` → separación por temporadas (PARTIDO, T2026=<id temporada 2026>).
7. `reactivar.js` → volver a una temporada anterior.
8. `compartir.js` → títulos e imágenes al compartir (SALIDA=<carpeta para capturas>).
9. `invitacion.py` + `bienvenida.js` → invitación por enlace y creación de contraseña.
10. `records-main.js` → récords de LIBAVIME (URL=<página>).

`clave.py <correo>` pone una contraseña temporal a un usuario de prueba y la imprime.
Ejemplo: `NODE_PATH=/tmp/e2e/node_modules CORREO=... CLAVE=$(python3 -I supabase/pruebas/navegador/clave.py ...) node supabase/pruebas/navegador/crear.js`
