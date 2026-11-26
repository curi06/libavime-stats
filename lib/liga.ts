// Tipos y utilidades de la liga activa (sirven en servidor y navegador).

export const LIGA_PRINCIPAL =
  process.env.NEXT_PUBLIC_LIGA_PRINCIPAL?.trim() || "libavime";

// Secciones de cada liga. Las direcciones antiguas sin liga (por ejemplo
// /estadisticas) se redirigen a la liga principal.
export const SECCIONES_LIGA = [
  "admin",
  "calendario",
  "clasificacion",
  "equipos",
  "estadisticas",
  "jugadores",
  "mvp",
  "partidos",
  "planilla",
  "resultados",
] as const;

export type ConfiguracionLiga = {
  temporada?: string;
  campeon_defensor?: { equipo: string; temporada: string };
  inauguracion?: { fecha: string; lugar?: string };
  inicio_temporada?: string;
  redes?: { instagram?: string; youtube?: string };
};

export type Liga = {
  id: string;
  slug: string;
  nombre: string;
  nombre_corto: string | null;
  descripcion: string | null;
  ciudad: string | null;
  logo_url: string | null;
  banner_url: string | null;
  color_primario: string;
  color_secundario: string;
  estado: "pendiente" | "activa" | "suspendida";
  configuracion: ConfiguracionLiga;
};

export type EquipoLiga = {
  id: number;
  nombre: string;
  slug: string;
  logo: string;
  color: string | null;
  color_principal: string | null;
  color_secundario: string | null;
};

export const LOGO_POR_DEFECTO = "/logos/quinteto-pro.svg";

export const nombreCortoLiga = (liga: Pick<Liga, "nombre" | "nombre_corto">) =>
  liga.nombre_corto?.trim() || liga.nombre;

/** Nombre de la temporada en curso ("2026"). */
export const temporadaLiga = (liga: Pick<Liga, "configuracion">) =>
  liga.configuracion?.temporada?.trim() || String(new Date().getFullYear());

export const logoLiga = (liga: Pick<Liga, "logo_url">) =>
  liga.logo_url?.trim() || LOGO_POR_DEFECTO;

/** "/estadisticas" → "/liga-x/estadisticas"; "/" → "/liga-x". */
export function rutaLiga(slug: string, ruta = "/") {
  const limpia = ruta.startsWith("/") ? ruta : `/${ruta}`;
  return limpia === "/" ? `/${slug}` : `/${slug}${limpia}`;
}

/** Normaliza la ruta de un logo guardado en la base de datos. */
export function rutaLogo(logo: string | null | undefined, respaldo = LOGO_POR_DEFECTO) {
  const valor = String(logo ?? "").trim();
  if (!valor) return respaldo;
  if (valor.startsWith("/") || valor.startsWith("http")) return valor;
  return `/logos/${valor}`;
}

export const columnasLiga =
  "id, slug, nombre, nombre_corto, descripcion, ciudad, logo_url, banner_url, color_primario, color_secundario, estado, configuracion";

export const columnasEquipo =
  "id, nombre, slug, logo, color, color_principal, color_secundario";

export function normalizarEquipos(filas: Partial<EquipoLiga>[] | null, liga: Liga): EquipoLiga[] {
  return (filas ?? [])
    .filter((e) => e.nombre)
    .map((e) => ({
      id: Number(e.id),
      nombre: String(e.nombre).trim(),
      slug: String(e.slug ?? e.nombre).trim().toLowerCase().replace(/\s+/g, "-"),
      logo: rutaLogo(e.logo, logoLiga(liga)),
      color: e.color ?? null,
      color_principal: e.color_principal ?? null,
      color_secundario: e.color_secundario ?? null,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
