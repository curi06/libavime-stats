// Lectura de un calendario pegado desde WhatsApp o Excel.
// Una línea por partido: "fecha, hora, Local vs Visitante, cancha" (el
// orden es flexible; los equipos también pueden ir en columnas separadas).

export type FilaPartido = {
  linea: number;
  original: string;
  fecha: string;   // AAAA-MM-DD
  hora: string;    // "6:00 PM"
  local: string;
  visitante: string;
  cancha: string;
  problema: string | null;
};

export const MAX_PARTIDOS = 200;

const sinAcentos = (v: string) =>
  v.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

const dos = (n: number) => String(n).padStart(2, "0");

/** Fecha en AAAA-MM-DD o null. Sin año: la próxima ocurrencia desde hoy. */
export function leerFecha(texto: string, hoy = new Date()): string | null {
  const t = texto.trim();
  let a: number, m: number, d: number;
  let r = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (r) [a, m, d] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else if ((r = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/))) {
    [d, m, a] = [Number(r[1]), Number(r[2]), Number(r[3])];
    if (a < 100) a += 2000;
  } else if ((r = t.match(/^(\d{1,2})[/.](\d{1,2})$/))) {
    [d, m] = [Number(r[1]), Number(r[2])];
    a = hoy.getFullYear();
    const esteAno = new Date(a, m - 1, d);
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    if (esteAno < inicioHoy) a += 1;
  } else return null;
  const fecha = new Date(a, m - 1, d);
  if (fecha.getFullYear() !== a || fecha.getMonth() !== m - 1 || fecha.getDate() !== d) return null;
  return `${a}-${dos(m)}-${dos(d)}`;
}

/** Hora como "6:00 PM" o null. Acepta 6pm, 6:30 pm, 18:00, 6:00 P.M. */
export function leerHora(texto: string): string | null {
  const r = texto.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?$/);
  if (!r) return null;
  let h = Number(r[1]);
  const min = Number(r[2] ?? 0);
  const meridiano = r[3]?.replace(/[\s.]/g, "");
  if (!r[2] && !meridiano) return null; // "7" solo no es una hora (puede ser un número)
  if (min > 59 || h > 23) return null;
  if (meridiano === "pm" && h < 12) h += 12;
  if (meridiano === "am" && h === 12) h = 0;
  if (!meridiano && h > 23) return null;
  const h12 = h % 12 || 12;
  return `${h12}:${dos(min)} ${h < 12 ? "AM" : "PM"}`;
}

function partes(linea: string) {
  const separador = linea.includes("\t") ? "\t" : linea.includes(";") ? ";" : ",";
  return linea.split(separador).map((p) => p.trim()).filter(Boolean);
}

export function leerCalendario(
  texto: string,
  equiposLiga: string[],
  porDefecto: { hora: string; cancha: string },
  existentes: { fecha: string; local: string; visitante: string }[],
  hoy = new Date()
): FilaPartido[] {
  const equipoPorClave = new Map(equiposLiga.map((e) => [sinAcentos(e), e]));
  const clavePartido = (f: string, a: string, b: string) => `${f}|${[sinAcentos(a), sinAcentos(b)].sort().join("|")}`;
  const usados = new Set(existentes.map((p) => clavePartido(p.fecha, p.local, p.visitante)));
  const reconocerEquipo = (t: string) => equipoPorClave.get(sinAcentos(t)) ?? null;

  const filas: FilaPartido[] = [];
  texto.split(/\r?\n/).forEach((original, i) => {
    const limpia = original.replace(/^\s*(?:\d+[.)]\s+|[-•*]\s+)/, "").trim();
    if (!limpia) return;

    let fecha = "";
    let hora = "";
    let cancha = "";
    let local = "";
    let visitante = "";
    const desconocidos: string[] = [];

    for (const parte of partes(limpia)) {
      const enfrentamiento = parte.split(/\s+(?:vs\.?|v\/s|x|contra)\s+|\s+[-–]\s+/i);
      if (enfrentamiento.length === 2 && !local) {
        const [a, b] = enfrentamiento.map((e) => e.trim());
        local = reconocerEquipo(a) ?? "";
        visitante = reconocerEquipo(b) ?? "";
        if (!local) desconocidos.push(a);
        if (!visitante) desconocidos.push(b);
        if (!local || !visitante) { local = local || a; visitante = visitante || b; }
        continue;
      }
      const f = !fecha ? leerFecha(parte, hoy) : null;
      if (f) { fecha = f; continue; }
      const h = !hora ? leerHora(parte) : null;
      if (h) { hora = h; continue; }
      const equipo = reconocerEquipo(parte);
      if (equipo && !local) { local = equipo; continue; }
      if (equipo && !visitante) { visitante = equipo; continue; }
      if (!cancha) { cancha = parte; continue; }
      desconocidos.push(parte);
    }
    hora = hora || porDefecto.hora;
    cancha = cancha || porDefecto.cancha;

    let problema: string | null = null;
    if (!fecha) problema = "Falta la fecha o no es válida (usa 05/12/2026, 5/12 o 2026-12-05)";
    else if (!local || !visitante) problema = "Faltan los equipos (escribe: Local vs Visitante)";
    else if (desconocidos.length) problema = `No se reconoce: ${desconocidos.map((d) => `"${d}"`).join(", ")} (¿el equipo está bien escrito?)`;
    else if (sinAcentos(local) === sinAcentos(visitante)) problema = "Un equipo no puede jugar contra sí mismo";
    else if (!hora) problema = "Falta la hora (escríbela en la línea o pon una hora por defecto)";
    else if (usados.has(clavePartido(fecha, local, visitante))) problema = "Ese partido ya está en el calendario o repetido en la lista";

    if (!problema) usados.add(clavePartido(fecha, local, visitante));
    filas.push({ linea: i + 1, original, fecha, hora, local, visitante, cancha, problema });
  });
  return filas.slice(0, MAX_PARTIDOS);
}
