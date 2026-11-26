// Texto para compartir el resultado de un partido (WhatsApp, redes…).

export type LiderPartido = { nombre: string; equipo: string; puntos: number };

export function textoResultado({
  liga,
  local,
  visitante,
  puntosLocal,
  puntosVisitante,
  fecha,
  lideres = [],
  url,
}: {
  liga: string;
  local: string;
  visitante: string;
  puntosLocal: number;
  puntosVisitante: number;
  fecha?: string | null;
  lideres?: LiderPartido[];
  url: string;
}) {
  const ganador =
    puntosLocal === puntosVisitante ? null : puntosLocal > puntosVisitante ? local : visitante;
  const lineas = [
    `🏀 ${liga} · Resultado final${fecha ? ` (${fecha.split("-").reverse().join("/")})` : ""}`,
    "",
    `${local} ${puntosLocal} - ${puntosVisitante} ${visitante}`,
    ganador ? `🏆 Ganó ${ganador}` : "Empate",
  ];
  const conPuntos = lideres.filter((l) => l.puntos > 0);
  if (conPuntos.length) {
    lineas.push("", "🔥 Máximos anotadores:");
    conPuntos.forEach((l) => lineas.push(`• ${l.nombre} (${l.equipo}): ${l.puntos} pts`));
  }
  lineas.push("", `📊 Box score: ${url}`);
  return lineas.join("\n");
}

/** Máximo anotador de cada equipo a partir de las filas del partido. */
export function lideresPorEquipo(
  filas: { nombre: string; equipo: string | null; puntos: number }[],
  equipos: string[]
): LiderPartido[] {
  return equipos
    .map((equipo) => {
      const mejor = filas
        .filter((f) => (f.equipo ?? "").trim().toLowerCase() === equipo.trim().toLowerCase())
        .sort((a, b) => b.puntos - a.puntos)[0];
      return mejor ? { nombre: mejor.nombre, equipo, puntos: mejor.puntos } : null;
    })
    .filter((l): l is LiderPartido => l !== null);
}
