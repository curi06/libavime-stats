import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { obtenerLiga } from "@/lib/liga-servidor";
import { LOGO_POR_DEFECTO, logoLiga, nombreCortoLiga, rutaLiga, temporadaLiga, type EquipoLiga, idTemporada, resolverTemporada, temporadaActivaDe } from "@/lib/liga";
import Navbar from "@/app/components/Navbar";
import Image from "next/image";
import Link from "next/link";
export const dynamic = "force-dynamic";

type Jugador = {
  id: number;
  slug: string | null;
  nombre: string;
  equipo: string | null;
  foto: string | null;
};

type EstadisticaPartido = {
  jugador_id: number;
  partido_id: number;
  puntos: number | null;
  rebotes: number | null;
  asistencias: number | null;
  estado: string | null;
};

type Partido = {
  equipo_local: string | null;
  equipo_visitante: string | null;
  puntos_local: number | null;
  puntos_visitante: number | null;
  estado: string | null;
};

type CandidatoMVP = Jugador & {
  ppg: number;
  rpg: number;
  apg: number;
  partidos_jugados: number;
  puntos_totales: number;
  rebotes_totales: number;
  asistencias_totales: number;
  promedio_estadistico: number;
  posicion_equipo: number;

  // Desglose de la puntuación MVP
  puntuacion_puntos: number;
  puntuacion_asistencias: number;
  puntuacion_rebotes: number;
  puntuacion_posicion: number;

  puntuacion_mvp: number;
};

const normalizar = (valor: string | null) =>
  String(valor ?? "").trim().toLowerCase();

const esPartidoFinalizado = (estado: string | null) => {
  const valor = normalizar(estado);
  return [
    "finalizado",
    "final",
    "terminado",
    "completed",
  ].includes(valor);
};
export const metadata = { title: "Candidatos a MVP" };


  export default async function MVPPage({
  params,
  searchParams,
}: {
  params: Promise<{ liga: string }>;
  searchParams: Promise<{ temporada?: string }>;
}) {
  const { liga: slugLiga } = await params;
  const datosLiga = await obtenerLiga(slugLiga);
  if (!datosLiga) notFound();
  const { liga, equipos: equiposLiga } = datosLiga;
  // Temporada que se está viendo (?temporada= o la activa).
  const temporadaVista = resolverTemporada(datosLiga.temporadas, (await searchParams).temporada);
  const temporadaId = idTemporada(temporadaVista);
  const enlaceTemporada =
    temporadaVista && temporadaVista.id !== temporadaActivaDe(datosLiga.temporadas)?.id ? temporadaVista.id : null;
  const ruta = (r: string) => rutaLiga(liga.slug, r, enlaceTemporada);
  const nombreLiga = nombreCortoLiga(liga);
  const temporada = enlaceTemporada && temporadaVista
    ? temporadaVista.nombre.replace(/^temporada\s+/i, "").trim() || temporadaVista.nombre
    : temporadaLiga(liga);
  void ruta; void nombreLiga; void temporada; void equiposLiga;

  const [
    { data: jugadoresData, error: jugadoresError },
    { data: estadisticasData, error: estadisticasError },
    { data: partidosData, error: partidosError },
  ] = await Promise.all([
    supabase
      .from("jugadores")
      .select("id, slug, nombre, equipo, foto")
      .eq("liga_id", liga.id),
    supabase
      .from("estadisticas_partido")
.select(`
  jugador_id,
  partido_id,
  puntos,
  rebotes,
  asistencias,
  estado
`)
      .eq("temporada_id", temporadaId)
      .eq("liga_id", liga.id),
    supabase
      .from("partidos")
.select(
  "id, equipo_local, equipo_visitante, puntos_local, puntos_visitante, estado"
)
      .eq("temporada_id", temporadaId)
      .eq("liga_id", liga.id),
  ]);

  if (
    jugadoresError ||
    estadisticasError ||
    partidosError ||
    !jugadoresData
  ) {
    console.error("Error jugadores:", jugadoresError);
    console.error("Error estadísticas:", estadisticasError);
    console.error("Error partidos:", partidosError);

    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-slate-100 pt-40 p-4 md:p-10">
          <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl p-10 text-center">
            <h1 className="text-3xl font-black">
              No se pudieron cargar las estadísticas
            </h1>
          </div>
        </main>
      </>
    );
  }

 const partidosFinalizados = new Set(
  (partidosData ?? [])
    .filter((partido) => esPartidoFinalizado(partido.estado))
    .map((partido) => Number(partido.id))
);

const acumuladosPorJugador = new Map<
  number,
  {
    partidos: Set<number>;
    puntos: number;
    rebotes: number;
    asistencias: number;
  }
>();

((estadisticasData ?? []) as EstadisticaPartido[]).forEach((registro) => {
  const jugadorId = Number(registro.jugador_id);
  const partidoId = Number(registro.partido_id);

  if (!partidosFinalizados.has(partidoId)) return;

  const estado = normalizar(registro.estado);

  if (estado === "no_jugo" || estado === "lesionado") return;

  if (!acumuladosPorJugador.has(jugadorId)) {
    acumuladosPorJugador.set(jugadorId, {
      partidos: new Set<number>(),
      puntos: 0,
      rebotes: 0,
      asistencias: 0,
    });
  }

  const acumulado = acumuladosPorJugador.get(jugadorId)!;

  acumulado.partidos.add(partidoId);
  acumulado.puntos += Number(registro.puntos) || 0;
  acumulado.rebotes += Number(registro.rebotes) || 0;
  acumulado.asistencias += Number(registro.asistencias) || 0;
});

  const equipos = new Map<
    string,
    { nombre: string; victorias: number; derrotas: number; favor: number; contra: number }
  >();

  ((partidosData ?? []) as Partido[]).forEach((partido) => {
    if (
      !esPartidoFinalizado(partido.estado) ||
      partido.puntos_local === null ||
      partido.puntos_visitante === null
    ) {
      return;
    }

    const local = String(partido.equipo_local ?? "").trim();
    const visitante = String(partido.equipo_visitante ?? "").trim();

    if (!local || !visitante) return;

    if (!equipos.has(local)) {
      equipos.set(local, {
        nombre: local,
        victorias: 0,
        derrotas: 0,
        favor: 0,
        contra: 0,
      });
    }

    if (!equipos.has(visitante)) {
      equipos.set(visitante, {
        nombre: visitante,
        victorias: 0,
        derrotas: 0,
        favor: 0,
        contra: 0,
      });
    }

    const equipoLocal = equipos.get(local)!;
    const equipoVisitante = equipos.get(visitante)!;
    const puntosLocal = Number(partido.puntos_local);
    const puntosVisitante = Number(partido.puntos_visitante);

    equipoLocal.favor += puntosLocal;
    equipoLocal.contra += puntosVisitante;
    equipoVisitante.favor += puntosVisitante;
    equipoVisitante.contra += puntosLocal;

    if (puntosLocal > puntosVisitante) {
      equipoLocal.victorias += 1;
      equipoVisitante.derrotas += 1;
    } else if (puntosVisitante > puntosLocal) {
      equipoVisitante.victorias += 1;
      equipoLocal.derrotas += 1;
    }
  });

  const clasificacion = [...equipos.values()]
    .sort((a, b) => {
      if (b.victorias !== a.victorias) return b.victorias - a.victorias;

      const diferenciaA = a.favor - a.contra;
      const diferenciaB = b.favor - b.contra;

      if (diferenciaB !== diferenciaA) return diferenciaB - diferenciaA;
      return b.favor - a.favor;
    })
    .map((equipo, index) => ({
      ...equipo,
      posicion: index + 1,
    }));

  const posicionPorEquipo = new Map<string, number>();

  clasificacion.forEach((equipo) => {
    posicionPorEquipo.set(normalizar(equipo.nombre), equipo.posicion);
  });

  const jugadores = (jugadoresData as Jugador[]).map((jugador) => {
  const acumulado = acumuladosPorJugador.get(Number(jugador.id));

  const partidosJugados = acumulado?.partidos.size ?? 0;
  const puntosTotales = acumulado?.puntos ?? 0;
  const rebotesTotales = acumulado?.rebotes ?? 0;
  const asistenciasTotales = acumulado?.asistencias ?? 0;

  const ppg =
    partidosJugados > 0
      ? Number((puntosTotales / partidosJugados).toFixed(1))
      : 0;

  const rpg =
    partidosJugados > 0
      ? Number((rebotesTotales / partidosJugados).toFixed(1))
      : 0;

  const apg =
    partidosJugados > 0
      ? Number((asistenciasTotales / partidosJugados).toFixed(1))
      : 0;

  return {
    ...jugador,
    ppg,
    rpg,
    apg,
    partidos_jugados: partidosJugados,
    puntos_totales: puntosTotales,
    rebotes_totales: rebotesTotales,
    asistencias_totales: asistenciasTotales,
    promedio_estadistico: Number(((ppg + rpg + apg) / 3).toFixed(2)),
  };
});

  // 1. Identificar los equipos y sus partidos disputados
const equipoPorNombre = new Map(
  [...equipos.values()].map((equipo) => [
    normalizar(equipo.nombre),
    equipo,
  ])
);

// 2. Aplicar el requisito mínimo de participación: 60%
const cantidadEquipos = clasificacion.length;
const jugadoresElegibles = jugadores.filter((jugador) => {
  const equipo = equipoPorNombre.get(normalizar(jugador.equipo));

  const partidosEquipo = equipo
    ? equipo.victorias + equipo.derrotas
    : 0;

  if (partidosEquipo === 0) return false;

  const porcentajeParticipacion =
    jugador.partidos_jugados / partidosEquipo;

  return (
    jugador.partidos_jugados > 0 &&
    porcentajeParticipacion >= 0.60 &&
    (jugador.ppg > 0 || jugador.rpg > 0 || jugador.apg > 0)
  );
});

// 3. Encontrar el mejor promedio en cada categoría
const maxPPG = Math.max(
  ...jugadoresElegibles.map((jugador) => jugador.ppg),
  0
);

const maxAPG = Math.max(
  ...jugadoresElegibles.map((jugador) => jugador.apg),
  0
);

const maxRPG = Math.max(
  ...jugadoresElegibles.map((jugador) => jugador.rpg),
  0
);

// 4. Calcular la puntuación de cada candidato
const candidatos: CandidatoMVP[] = jugadoresElegibles
  .map((jugador) => {
    const posicionEquipo =
      posicionPorEquipo.get(normalizar(jugador.equipo)) ?? 0;

    const puntosNormalizados =
      maxPPG > 0 ? (jugador.ppg / maxPPG) * 100 : 0;

    const asistenciasNormalizadas =
      maxAPG > 0 ? (jugador.apg / maxAPG) * 100 : 0;

    const rebotesNormalizados =
      maxRPG > 0 ? (jugador.rpg / maxRPG) * 100 : 0;

    // Puntuación según la posición del equipo
    const puntuacionPosicion =
      posicionEquipo > 0
        ? cantidadEquipos > 1
          ? ((cantidadEquipos - posicionEquipo) /
              (cantidadEquipos - 1)) *
            100
          : 100
        : 0;

    // Fórmula MVP: 30% puntos, 25% asistencias,
    // 20% rebotes y 25% posición del equipo

const puntuacionPuntos = puntosNormalizados * 0.30;
const puntuacionAsistencias = asistenciasNormalizadas * 0.25;
const puntuacionRebotes = rebotesNormalizados * 0.20;
const puntuacionEquipo = puntuacionPosicion * 0.25;

const puntuacionMVP =
  puntuacionPuntos +
  puntuacionAsistencias +
  puntuacionRebotes +
  puntuacionEquipo;

// Redondear la puntuación total
const totalRedondeado = Number(puntuacionMVP.toFixed(2));

// Redondear los primeros tres componentes
const puntosRedondeados = Number(puntuacionPuntos.toFixed(2));
const asistenciasRedondeadas = Number(puntuacionAsistencias.toFixed(2));
const rebotesRedondeados = Number(puntuacionRebotes.toFixed(2));

// Ajustar el último componente para cuadrar la suma
const posicionRedondeada = Number(
  (
    totalRedondeado -
    puntosRedondeados -
    asistenciasRedondeadas -
    rebotesRedondeados
  ).toFixed(2)
);

return {
  ...jugador,
  posicion_equipo: posicionEquipo,
  puntuacion_puntos: puntosRedondeados,
  puntuacion_asistencias: asistenciasRedondeadas,
  puntuacion_rebotes: rebotesRedondeados,
  puntuacion_posicion: posicionRedondeada,
  puntuacion_mvp: totalRedondeado,
};

  })
  .sort((a, b) => {
    if (b.puntuacion_mvp !== a.puntuacion_mvp) {
      return b.puntuacion_mvp - a.puntuacion_mvp;
    }

    if (b.ppg !== a.ppg) return b.ppg - a.ppg;
    if (b.apg !== a.apg) return b.apg - a.apg;
    return b.rpg - a.rpg;
  })
  .slice(0, 6);

  if (candidatos.length === 0) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-slate-100 pt-32 p-4 md:p-10">
          <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl p-10 text-center">
            <h1 className="text-3xl font-black">
              Aún no hay estadísticas registradas
            </h1>
            <p className="text-gray-600 mt-3">
              Registra estadísticas individuales desde el panel administrativo
              para seleccionar los candidatos a MVP.
            </p>
          </div>
        </main>
      </>
    );
  }

  const medallas = ["🥇", "🥈", "🥉"];
  const gradientes = [
    "from-yellow-400 to-yellow-600",
    "from-slate-400 to-slate-600",
    "from-orange-400 to-orange-600",
  ];

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-100 pt-32 p-4 md:p-10">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl py-5 px-6 mb-10 mt-8 md:mt-12 text-center">
              <h1 className="text-3xl md:text-5xl font-black text-white">
                🏆 MVP {nombreLiga} {temporada}
              </h1>
              <p className="text-white/90 mt-2 font-bold text-lg">
                Candidatos a MVP de la Serie Regular
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {candidatos.map((candidato, index) => {
                const foto =
                  candidato.foto &&
                  (candidato.foto.startsWith("http") ||
                    candidato.foto.startsWith("/"))
                    ? candidato.foto
                    : LOGO_POR_DEFECTO;

                const posicionTexto =
                  candidato.posicion_equipo > 0
                    ? `${candidato.posicion_equipo}° lugar`
                    : "Sin clasificación";

                return (
                  <div
                    key={candidato.id}
                    className={`rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-white ${
                      index === 0 ? "md:-translate-y-4" : ""
                    }`}
                  >
                    <div
                      className={`bg-gradient-to-r ${gradientes[index]} text-white text-center py-4 px-4`}
                    >
                      <p className="text-4xl">{medallas[index]}</p>
                      <p className="font-black text-xl">
                        CANDIDATO #{index + 1}
                      </p>
                    </div>

                    <div className="p-6 text-center">
                      <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-full border-4 border-yellow-300 bg-white shadow-2xl ring-4 ring-yellow-200/40">
                        <Image
                          src={foto}
                          alt={candidato.nombre}
                          fill
                          sizes="160px"
                          className="object-cover"
                          style={{
                            transform: "scale(1.45)",
                            transformOrigin: "center center",
                            objectPosition: "50% 20%",
                          }}
                        />
                      </div>

                      <h2 className="text-2xl font-black mt-5">
                        {candidato.nombre}
                      </h2>

                      <p className="text-lg font-bold mt-1">
                        {candidato.equipo ?? "Sin equipo"}
                      </p>

                      <div className="mt-4 bg-slate-100 rounded-2xl p-4">
                        <p className="text-sm text-gray-500 font-bold">
                          POSICIÓN DEL EQUIPO
                        </p>
                        <p className="text-3xl font-black text-blue-900">
                          {posicionTexto}
                        </p>
                      </div>

                      <div className="mt-5 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                        <p className="text-sm text-gray-600 font-bold">
                          PUNTUACIÓN MVP
                        </p>
                        <p className="text-4xl font-black text-yellow-600">
                          {candidato.puntuacion_mvp.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          30% puntos · 25% asistencias · 20% rebotes · 25% posición
                        </p>
                      </div>

<div className="mt-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left">
  <p className="text-sm font-black text-slate-700 mb-3 text-center">
    DESGLOSE DE PUNTUACIÓN
  </p>

  <div className="grid grid-cols-2 gap-3">

    <div className="bg-white rounded-xl p-3 border border-blue-100">
      <p className="text-xs text-gray-500 font-bold">
        🏀 PUNTOS (30%)
      </p>
      <p className="text-xl font-black text-blue-900">
        {candidato.puntuacion_puntos.toFixed(2)}
      </p>
    </div>

    <div className="bg-white rounded-xl p-3 border border-red-100">
      <p className="text-xs text-gray-500 font-bold">
        🎯 ASISTENCIAS (25%)
      </p>
      <p className="text-xl font-black text-red-700">
        {candidato.puntuacion_asistencias.toFixed(2)}
      </p>
    </div>

    <div className="bg-white rounded-xl p-3 border border-green-100">
      <p className="text-xs text-gray-500 font-bold">
        💪 REBOTES (20%)
      </p>
      <p className="text-xl font-black text-green-700">
        {candidato.puntuacion_rebotes.toFixed(2)}
      </p>
    </div>

    <div className="bg-white rounded-xl p-3 border border-yellow-100">
      <p className="text-xs text-gray-500 font-bold">
        🏆 EQUIPO (25%)
      </p>
      <p className="text-xl font-black text-yellow-700">
        {candidato.puntuacion_posicion.toFixed(2)}
      </p>
    </div>

  </div>
</div>


                      <div className="mt-5">
                        <p className="text-sm font-bold text-gray-500">
                          PROMEDIO ESTADÍSTICO
                        </p>
                        <p className="text-3xl font-black text-blue-900">
                          {candidato.promedio_estadistico}
                        </p>
                        <p className="text-xs text-gray-500">
                          (PPG + RPG + APG) ÷ 3
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-6">
                        <div className="bg-blue-100 rounded-xl p-3">
                          <p className="text-xs">🏀 Puntos</p>
                          <p className="text-2xl font-black text-blue-900">
                            {candidato.ppg}
                          </p>
                          <p className="text-xs">PPG</p>
                        </div>

                        <div className="bg-green-100 rounded-xl p-3">
                          <p className="text-xs">💪 Rebotes</p>
                          <p className="text-2xl font-black text-green-700">
                            {candidato.rpg}
                          </p>
                          <p className="text-xs">RPG</p>
                        </div>

                        <div className="bg-red-100 rounded-xl p-3">
                          <p className="text-xs">🎯 Asist.</p>
                          <p className="text-2xl font-black text-red-700">
                            {candidato.apg}
                          </p>
                          <p className="text-xs">APG</p>
                        </div>
                      </div>

                      <p className="text-gray-500 text-sm mt-5">
                        {candidato.partidos_jugados} partidos jugados
                      </p>

                      {candidato.slug && (
                        <Link
                          href={ruta(`/jugadores/${candidato.slug}`)}
                          className="inline-block mt-6 bg-blue-900 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-800 transition"
                        >
                          Ver Perfil
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

           <div className="mt-10 bg-slate-50 rounded-2xl p-6 text-center">
  <p className="font-black text-lg">
    📊 ¿Cómo se determina el MVP?
  </p>

  <p className="text-gray-600 mt-2">
  La puntuación del MVP se determina mediante cuatro componentes:
  puntos por partido (30%), asistencias por partido (25%),
  rebotes por partido (20%) y posición final del equipo en la
  Serie Regular (25%). Cada estadística individual se normaliza
  tomando como referencia el mejor promedio de los candidatos elegibles.
</p>

  <p className="text-gray-500 text-sm mt-2">
    El sistema se actualiza automáticamente conforme cambian las
    estadísticas individuales y el récord de los equipos durante la
    Serie Regular.
  </p>
</div>
          </div>
        </div>
      </main>
    </>
  );
}
