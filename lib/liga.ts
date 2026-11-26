// Tipos y utilidades de la liga activa (sirven en servidor y navegador).

/**
 * Liga que se muestra en la portada del dominio ("/") y a la que se
 * redirigen las direcciones antiguas sin liga (/estadisticas…).
 * NEXT_PUBLIC_LIGA_PRINCIPAL=ninguna → la portada es la presentación de
 * Quinteto Pro (para cuando la plataforma tenga dominio propio).
 */
const ligaPrincipalConfigurada = process.env.NEXT_PUBLIC_LIGA_PRINCIPAL?.trim();
export const LIGA_PRINCIPAL =
  ligaPrincipalConfigurada === "ninguna" ? "" : ligaPrincipalConfigurada || "libavime";

/**
 * Liga fundadora (LIBAVIME). Conserva comportamientos históricos que no
 * dependen de la portada: la clave antigua de encuadres, sus fotos
 * recortadas, el respaldo por correo de su administradora y la protección
 * contra suspensiones accidentales.
 */
export const LIGA_HISTORICA = "libavime";

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
  /** Logo cuadrado y recortado para la imagen al compartir (opcional). */
  logo_compartir?: string;
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

/**
 * "/estadisticas" → "/liga-x/estadisticas"; "/" → "/liga-x".
 * Si se indica una temporada (distinta de la activa), se conserva en el
 * enlace como ?temporada=<id>.
 */
export function rutaLiga(slug: string, ruta = "/", temporada?: number | null) {
  const limpia = ruta.startsWith("/") ? ruta : `/${ruta}`;
  const base = limpia === "/" ? `/${slug}` : `/${slug}${limpia}`;
  if (!temporada) return base;
  const [camino, hash = ""] = base.split("#");
  const separador = camino.includes("?") ? "&" : "?";
  return `${camino}${separador}temporada=${temporada}${hash ? `#${hash}` : ""}`;
}

export type TemporadaLiga = {
  id: number;
  nombre: string;
  activa: boolean;
  fecha_inicio: string | null;
};

/** Temporada activa (o la más reciente si ninguna está marcada). */
export function temporadaActivaDe(temporadas: TemporadaLiga[]) {
  return temporadas.find((t) => t.activa) ?? temporadas[0] ?? null;
}

/** Temporada pedida en ?temporada=, si es de esta liga; si no, la activa. */
export function resolverTemporada(temporadas: TemporadaLiga[], parametro: unknown) {
  const id = Number(Array.isArray(parametro) ? parametro[0] : parametro);
  return temporadas.find((t) => t.id === id) ?? temporadaActivaDe(temporadas);
}

/** Id de temporada para filtrar consultas (-1 si la liga no tiene: no muestra nada). */
export const idTemporada = (t: TemporadaLiga | null) => t?.id ?? -1;

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
