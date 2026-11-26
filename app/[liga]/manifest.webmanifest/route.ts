import { obtenerLiga } from "@/lib/liga-servidor";
import { LIGA_HISTORICA, nombreCortoLiga } from "@/lib/liga";

// Manifiesto de "app" de cada liga: al agregarla a la pantalla de inicio
// del celular, aparece con su nombre, su ícono y abre en su página.
/**
 * Nombre bajo el ícono (Android muestra ~12 caracteres): corta entre
 * palabras. "Liga Nueva de Pruebas" → "Liga Nueva".
 */
function nombreBajoIcono(nombre: string) {
  if (nombre.length <= 12) return nombre;
  let corto = "";
  for (const palabra of nombre.split(/\s+/)) {
    const siguiente = corto ? `${corto} ${palabra}` : palabra;
    if (siguiente.length > 12) break;
    corto = siguiente;
  }
  return (corto || nombre.slice(0, 12)).replace(/\s+(de|del|la|las|el|los|y)$/i, "");
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ liga: string }> }
) {
  const datos = await obtenerLiga((await params).liga);
  if (!datos) return new Response("Liga no encontrada", { status: 404 });
  const { liga } = datos;

  // LIBAVIME conserva sus íconos diseñados; las demás usan los generados.
  const iconos =
    liga.slug === LIGA_HISTORICA
      ? [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ]
      : [
          { src: `/${liga.slug}/icono/192`, sizes: "192x192", type: "image/png" },
          { src: `/${liga.slug}/icono/512`, sizes: "512x512", type: "image/png", purpose: "any" },
        ];

  const manifiesto = {
    id: `/${liga.slug}`,
    name: liga.nombre,
    short_name: nombreBajoIcono(nombreCortoLiga(liga)),
    description: liga.descripcion ?? `Estadísticas, resultados y calendario de ${liga.nombre}.`,
    start_url: `/${liga.slug}`,
    scope: `/${liga.slug}`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: liga.color_primario || "#111827",
    lang: "es",
    icons: iconos,
  };

  return new Response(JSON.stringify(manifiesto), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
