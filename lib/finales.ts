// Cálculo de la serie final a partir de los partidos con fase "finales".
// Lo usan la portada (app/components/PortadaFinales) y la plantilla
// "Ruta a la final" del editor de Instagram.

import { LOGO_POR_DEFECTO } from "@/lib/liga";

export const MEJOR_DE = 3;
export const VICTORIAS_PARA_CAMPEON = Math.ceil(MEJOR_DE / 2);

export const EQUIPOS_FINAL = {
  Gladiadores: {
    logo: "/logos/gladiadores.png",
    color: "#22c55e",
    colorOscuro: "#14532d",
  },
  Espartanos: {
    logo: "/logos/espartanos.png",
    color: "#facc15",
    colorOscuro: "#713f12",
  },
} as const;

export type EquipoFinal = keyof typeof EQUIPOS_FINAL;

export type PartidoFinalEntrada = {
  id: number | string;
  local: string;
  visitante: string;
  fecha: string;
  hora?: string | null;
  cancha?: string | null;
  puntosLocal: number | null;
  puntosVisitante: number | null;
  estado: string | null;
};

export type JuegoFinal = PartidoFinalEntrada & {
  numero: number;
  inicio: Date | null;
  finalizado: boolean;
  ganador: string | null;
};

export type SerieFinal = {
  juegos: JuegoFinal[];
  equipos: [string, string];
  victorias: Record<string, number>;
  proximo: JuegoFinal | null;
  campeon: string | null;
  decisivo: boolean;
};

const normalizar = (valor: unknown) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

/** Nombre oficial del equipo ("gladiadores " → "Gladiadores"). */
export function nombreEquipo(valor: unknown) {
  const limpio = normalizar(valor);
  const conocido = (Object.keys(EQUIPOS_FINAL) as EquipoFinal[]).find(
    (equipo) => normalizar(equipo) === limpio
  );
  return conocido ?? String(valor ?? "").trim();
}

type EquipoConEstilo = { nombre: string; logo?: string | null; color?: string | null };

const buscarEquipo = (nombre: string, equipos?: EquipoConEstilo[]) =>
  equipos?.find((e) => normalizar(e.nombre) === normalizar(nombre));

/** Logo del equipo: primero el de la liga; si no, el de respaldo. */
export function logoEquipo(nombre: string, equipos?: EquipoConEstilo[]) {
  return (
    buscarEquipo(nombre, equipos)?.logo ||
    EQUIPOS_FINAL[nombreEquipo(nombre) as EquipoFinal]?.logo ||
    LOGO_POR_DEFECTO
  );
}

/** Color del equipo: primero el registrado en la liga. */
export function colorEquipo(nombre: string, equipos?: EquipoConEstilo[]) {
  return (
    buscarEquipo(nombre, equipos)?.color ||
    EQUIPOS_FINAL[nombreEquipo(nombre) as EquipoFinal]?.color ||
    "#94a3b8"
  );
}

/**
 * Convierte fecha "2026-11-28" y hora en formatos como "4:00 PM",
 * "6:00 pm", "6:00 P:M" o "18:00" a una fecha en hora de República
 * Dominicana (UTC-4, sin horario de verano).
 */
export function fechaHoraPartido(fecha: string, hora?: string | null) {
  const [anio, mes, dia] = String(fecha ?? "").slice(0, 10).split("-").map(Number);
  if (!anio || !mes || !dia) return null;

  let horas = 0;
  let minutos = 0;
  const coincidencia = String(hora ?? "").match(
    /(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?\s*:?\s*m?/i
  );

  if (coincidencia) {
    horas = Number(coincidencia[1]);
    minutos = Number(coincidencia[2] ?? 0);
    const meridiano = coincidencia[3]?.toLowerCase();
    if (meridiano === "p" && horas < 12) horas += 12;
    if (meridiano === "a" && horas === 12) horas = 0;
  }

  return new Date(Date.UTC(anio, mes - 1, dia, horas + 4, minutos));
}

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Partes de la fecha en hora de República Dominicana. */
export function partesFecha(fecha: Date) {
  const local = new Date(fecha.getTime() - 4 * 60 * 60 * 1000);
  const horas24 = local.getUTCHours();
  const minutos = local.getUTCMinutes();
  const horas12 = horas24 % 12 || 12;

  return {
    diaSemana: DIAS[local.getUTCDay()],
    dia: local.getUTCDate(),
    mes: MESES[local.getUTCMonth()],
    hora: `${horas12}:${String(minutos).padStart(2, "0")} ${horas24 < 12 ? "AM" : "PM"}`,
  };
}

/** "Lugar" con mayúscula inicial en cada palabra: "CLUB LOS PRADOS" → "Club Los Prados". */
export function formatearCancha(cancha?: string | null) {
  return String(cancha ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
}

export function construirSerieFinal(partidos: PartidoFinalEntrada[]): SerieFinal | null {
  const ordenados = partidos
    .map((partido) => ({
      ...partido,
      local: nombreEquipo(partido.local),
      visitante: nombreEquipo(partido.visitante),
      inicio: fechaHoraPartido(partido.fecha, partido.hora),
    }))
    .sort(
      (a, b) =>
        (a.inicio?.getTime() ?? Infinity) - (b.inicio?.getTime() ?? Infinity) ||
        String(a.id).localeCompare(String(b.id), undefined, { numeric: true })
    );

  if (ordenados.length === 0) return null;

  const equipos: [string, string] = [ordenados[0].local, ordenados[0].visitante].sort(
    // Gladiadores siempre a la izquierda, Espartanos a la derecha.
    (a, b) => a.localeCompare(b)
  ).reverse() as [string, string];

  const victorias: Record<string, number> = { [equipos[0]]: 0, [equipos[1]]: 0 };
  let campeon: string | null = null;

  const juegos: JuegoFinal[] = ordenados.map((partido, indice) => {
    const finalizado =
      normalizar(partido.estado) === "finalizado" &&
      partido.puntosLocal !== null &&
      partido.puntosVisitante !== null;

    let ganador: string | null = null;
    if (finalizado && partido.puntosLocal !== partido.puntosVisitante) {
      ganador =
        Number(partido.puntosLocal) > Number(partido.puntosVisitante)
          ? partido.local
          : partido.visitante;
      victorias[ganador] = (victorias[ganador] ?? 0) + 1;
      if (!campeon && victorias[ganador] >= VICTORIAS_PARA_CAMPEON) {
        campeon = ganador;
      }
    }

    return { ...partido, numero: indice + 1, finalizado, ganador };
  });

  const proximo = campeon ? null : juegos.find((juego) => !juego.finalizado) ?? null;
  const decisivo =
    !campeon &&
    victorias[equipos[0]] === VICTORIAS_PARA_CAMPEON - 1 &&
    victorias[equipos[1]] === VICTORIAS_PARA_CAMPEON - 1;

  return { juegos, equipos, victorias, proximo, campeon, decisivo };
}
