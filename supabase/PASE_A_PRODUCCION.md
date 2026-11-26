# Quinteto Pro · Pase a producción

Ensayado el 2026-11-26 sobre una copia fresca de producción (datos y
57 políticas de seguridad reales). Resultado del ensayo:

| Prueba | Resultado |
|---|---|
| Migraciones 002 → 006 en orden | sin errores, 3 s en total |
| Código **actual** sobre la base migrada (`compatibilidad.py`) | 15/15 |
| Aislamiento entre ligas (`aislamiento.py`) | 31/31 |
| Plataforma, miembros y acceso (`plataforma.py`) | 30/30 |
| Páginas de LIBAVIME con el código nuevo | todas 200, récords correctos |

**Clave:** el código actual funciona sobre la base ya migrada. Por eso el
orden es *primero la base, después el código*, y si algo sale mal basta con
volver a publicar la versión anterior en Vercel (no hay que deshacer la base).

## Antes de empezar (la administradora)

1. Crear un token de Supabase con **escritura** sobre el proyecto de
   producción (`ialqgoofturuqrsdfwrl`) y guardarlo en un archivo nuevo
   `.env.produccion` como `SUPABASE_ACCESS_TOKEN=...` (no se sube a GitHub).
   Revocarlo al terminar.
2. Confirmar que no hay un partido en curso (la planilla no se usa durante
   los ~15 minutos del pase).

## Pasos

| # | Paso | Quién | Si falla |
|---|---|---|---|
| 1 | Respaldo: exportar todas las tablas a JSON (`copiar-datos` en modo lectura) y guardar la lista de políticas actuales | Claude | No seguir |
| 2 | Comprobar que las vistas `estadisticas_jugadores*` tienen las mismas columnas y tipos que las de 001 | Claude | Ajustar 002/006 antes de seguir |
| 3 | Aplicar `002_multiliga.sql` | Claude | La migración corre en una transacción: si falla no cambia nada |
| 4 | Aplicar `003`, `004`, `005`, `006` (en ese orden) | Claude | Igual que 3 |
| 5 | Verificar con lecturas que el sitio actual sigue igual (portada, estadísticas, galería, planilla) | Claude | Revisar antes de publicar código |
| 6 | Registrar a la administradora en `administradores_plataforma` (por su correo) | Claude | — |
| 7 | Integrar la rama `quinteto-pro` en `main`, subir y **promover** el despliegue en Vercel (el dominio no se mueve solo) | Claude | Promover el despliegue anterior en Vercel |
| 8 | Verificar en vivo: `/` y `/libavime`, redirecciones (`/estadisticas` → `/libavime/estadisticas`), `/ligas`, `/registro`, `/libavime/admin` con su cuenta | Claude + administradora | Volver al despliegue anterior |
| 9 | Supabase → Authentication → URL Configuration: agregar `https://libavime.vercel.app/bienvenida` a *Redirect URLs* | Administradora (guiada) | Las invitaciones no llevan a crear contraseña |
| 10 | (Antes de invitar ligas reales) Configurar un SMTP propio (p. ej. Resend) en Authentication → SMTP | Administradora (guiada) | Las invitaciones a correos nuevos no llegan |
| 11 | Revocar el token de producción | Administradora | — |

## Después

- La portada de `libavime.vercel.app` sigue siendo LIBAVIME. La plataforma
  vive en `/ligas`, `/registro` y `/plataforma`.
- Para repetir el ensayo: `reiniciar_pruebas.sql` → `001` → copiar datos →
  políticas de producción → `002…006` → las tres suites de `supabase/pruebas`.
