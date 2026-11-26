// Lectura de una lista de jugadores pegada desde WhatsApp o Excel.
// Una línea por jugador: "Nombre, número, posición, equipo" (el orden del
// número, la posición y el equipo es flexible).

export type FilaJugador = {
  linea: number;
  original: string;
  nombre: string;
  numero: number | null;
  posicion: string;
  equipo: string;
  slug: string;
  problema: string | null;
};

export const MAX_FILAS = 200;

const sinAcentos = (v: string) =>
  v.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

export const slugDe = (nombre: string) =>
  sinAcentos(nombre).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/** "Juan perez" → "Juan Perez" (respeta mayúsculas ya escritas). */
const capitalizar = (v: string) =>
  v.replace(/\s+/g, " ").trim().replace(/(^|\s)(\p{Ll})/gu, (_, e, l) => e + l.toUpperCase());

/** Divide una línea en partes: tabulación, punto y coma, coma o " - ". */
function partes(linea: string) {
  const separador = linea.includes("\t") ? "\t" : linea.includes(";") ? ";" : linea.includes(",") ? "," : / [-–] /;
  return linea.split(separador).map((p) => p.trim()).filter(Boolean);
}

export function leerLista(
  texto: string,
  equiposLiga: string[],
  equipoPorDefecto: string,
  existentes: { nombre: string; slug: string }[]
): FilaJugador[] {
  const equipoPorClave = new Map(equiposLiga.map((e) => [sinAcentos(e), e]));
  const nombresUsados = new Set(existentes.map((j) => sinAcentos(j.nombre)));
  const slugsUsados = new Set(existentes.map((j) => j.slug));

  const filas: FilaJugador[] = [];
  texto.split(/\r?\n/).forEach((original, i) => {
    // Quita viñetas y numeración de listas: "1. ", "- ", "• ".
    const limpia = original.replace(/^\s*(?:\d+[.)]\s+|[-•*]\s+)/, "").trim();
    if (!limpia) return;

    let nombre = "";
    let numero: number | null = null;
    let posicion = "";
    let equipo = "";
    let problema: string | null = null;

    for (const parte of partes(limpia)) {
      const sinNumeral = parte.replace(/^#/, "");
      if (numero === null && /^\d{1,3}$/.test(sinNumeral)) numero = Number(sinNumeral);
      else if (!equipo && equipoPorClave.has(sinAcentos(parte))) equipo = equipoPorClave.get(sinAcentos(parte))!;
      else if (!nombre) nombre = capitalizar(parte);
      else if (!posicion) posicion = capitalizar(parte);
      else if (!problema) problema = `No se reconoce "${parte}" (¿el equipo está bien escrito?)`;
    }
    if (!equipo) equipo = equipoPorDefecto;

    if (!nombre || nombre.length < 2) problema = "Falta el nombre";
    // Si hubo un texto sin reconocer, ese mensaje es más útil (suele ser
    // el equipo mal escrito).
    else if (!equipo && !problema) problema = "Falta el equipo (escríbelo en la línea o elige uno para toda la lista)";

    // Slug único dentro de la liga y de la lista.
    let slug = slugDe(nombre);
    if (slug) {
      const base = slug;
      for (let n = 2; slugsUsados.has(slug); n++) slug = `${base}-${n}`;
    }

    if (!problema && nombresUsados.has(sinAcentos(nombre))) {
      problema = "Ya existe un jugador con ese nombre en la liga o en la lista";
    }
    if (!problema) {
      nombresUsados.add(sinAcentos(nombre));
      slugsUsados.add(slug);
    }

    filas.push({ linea: i + 1, original, nombre, numero, posicion, equipo, slug, problema });
  });
  return filas.slice(0, MAX_FILAS);
}
