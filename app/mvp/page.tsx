import { supabase } from "@/lib/supabase";
import Navbar from "../components/Navbar";
import Image from "next/image";
import Link from "next/link";

type Jugador = {
  id: number;
  slug: string | null;
  nombre: string;
  equipo: string | null;
  foto: string | null;
};

type EstadisticaJugador = {
  jugador_id: number;
  ppg: number | null;
  rpg: number | null;
  apg: number | null;
  partidos_jugados: number | null;
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

  export default async function MVPPage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-100 pt-32 p-4 md:p-10">
        <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl p-10 text-center">
          <h1 className="text-3xl font-black text-blue-950">
            🏀 MVP
          </h1>

          <p className="text-gray-600 mt-3">
            Esta sección se encuentra temporalmente inactiva.
          </p>
        </div>
      </main>
    </>
  );
  const [
    { data: jugadoresData, error: jugadoresError },
    { data: estadisticasData, error: estadisticasError },
    { data: partidosData, error: partidosError },
  ] = await Promise.all([
    supabase
      .from("jugadores")
      .select("id, slug, nombre, equipo, foto"),
    supabase
      .from("estadisticas_jugadores")
      .select("jugador_id, ppg, rpg, apg, partidos_jugados"),
    supabase
      .from("partidos")
      .select(
        "equipo_local, equipo_visitante, puntos_local, puntos_visitante, estado"
      ),
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

  const estadisticasPorJugador = new Map<number, EstadisticaJugador>();

  ((estadisticasData ?? []) as EstadisticaJugador[]).forEach((estadistica) => {
    estadisticasPorJugador.set(Number(estadistica.jugador_id), estadistica);
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
    const estadistica = estadisticasPorJugador.get(Number(jugador.id));

    const partidosJugados = Number(estadistica?.partidos_jugados) || 0;
    const ppg = Number(estadistica?.ppg) || 0;
    const rpg = Number(estadistica?.rpg) || 0;
    const apg = Number(estadistica?.apg) || 0;

    return {
      ...jugador,
      ppg,
      rpg,
      apg,
      partidos_jugados: partidosJugados,
      puntos_totales: Number((ppg * partidosJugados).toFixed(1)),
      rebotes_totales: Number((rpg * partidosJugados).toFixed(1)),
      asistencias_totales: Number((apg * partidosJugados).toFixed(1)),
      promedio_estadistico: Number(((ppg + rpg + apg) / 3).toFixed(2)),
    };
  });

  const jugadoresActivos = jugadores.filter(
    (jugador) =>
      jugador.partidos_jugados > 0 &&
      (jugador.ppg > 0 || jugador.rpg > 0 || jugador.apg > 0)
  );

  const cantidadEquipos = clasificacion.length;

  const maxPromedio = Math.max(
    ...jugadoresActivos.map((jugador) => jugador.promedio_estadistico),
    0
  );

  const candidatos: CandidatoMVP[] = jugadoresActivos
    .map((jugador) => {
      const posicionEquipo =
        posicionPorEquipo.get(normalizar(jugador.equipo)) ?? 0;

      // La clasificación es el factor principal: 60%.
      // El rendimiento estadístico aporta el 40%.
      const puntosClasificacion =
        posicionEquipo > 0 && cantidadEquipos > 1
          ? ((cantidadEquipos - posicionEquipo) /
              (cantidadEquipos - 1)) *
            100
          : posicionEquipo === 1
            ? 100
            : 0;

      const puntosEstadisticos =
        maxPromedio > 0
          ? (jugador.promedio_estadistico / maxPromedio) * 100
          : 0;

      return {
        ...jugador,
        posicion_equipo: posicionEquipo,
        puntuacion_mvp: Number(
          (puntosClasificacion * 0.6 + puntosEstadisticos * 0.4).toFixed(2)
        ),
      };
    })
    .sort((a, b) => {
      if (b.puntuacion_mvp !== a.puntuacion_mvp) {
        return b.puntuacion_mvp - a.puntuacion_mvp;
      }
      if (b.promedio_estadistico !== a.promedio_estadistico) {
        return b.promedio_estadistico - a.promedio_estadistico;
      }
      if (b.ppg !== a.ppg) return b.ppg - a.ppg;
      if (b.rpg !== a.rpg) return b.rpg - a.rpg;
      return b.apg - a.apg;
    })
    .slice(0, 3);

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
                🏆 MVP LIBAVIME 2026
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
                    : "/logos/LIBAVIME.png";

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
                          {candidato.puntuacion_mvp}
                        </p>
                        <p className="text-xs text-gray-500">
                          60% equipo · 40% estadísticas
                        </p>
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
                          href={`/jugadores/${candidato.slug}`}
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
                La posición del equipo representa el <strong>50%</strong> de la
                puntuación y el promedio de puntos, rebotes y asistencias
                representa el <strong>50%</strong>.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                El sistema se actualiza automáticamente conforme cambian la
                clasificación y las estadísticas de la Serie Regular.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
