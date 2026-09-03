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

type EstadisticaPartido = {
  jugador_id: number;
  puntos: number | null;
  rebotes: number | null;
  asistencias: number | null;
};

type JugadorConEstadisticas = Jugador & {
  puntos_totales: number;
  rebotes_totales: number;
  asistencias_totales: number;
  partidos_jugados: number;
  ppg: number;
  rpg: number;
  apg: number;
};

export default async function MVPPage() {
  const { data: jugadoresData, error: jugadoresError } =
    await supabase
      .from("jugadores")
      .select("id, slug, nombre, equipo, foto");

  const { data: estadisticasData, error: estadisticasError } =
    await supabase
      .from("estadisticas_partido")
      .select(
        "jugador_id, puntos, rebotes, asistencias"
      );

  if (
    jugadoresError ||
    estadisticasError ||
    !jugadoresData
  ) {
    console.error(
      "Error jugadores:",
      jugadoresError
    );

    console.error(
      "Error estadísticas:",
      estadisticasError
    );

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

  const resumenPorJugador = new Map<
    number,
    {
      puntos_totales: number;
      rebotes_totales: number;
      asistencias_totales: number;
      partidos_jugados: number;
    }
  >();

  ((estadisticasData ?? []) as EstadisticaPartido[]).forEach(
    (estadistica) => {
      const jugadorId = Number(
        estadistica.jugador_id
      );

      if (!resumenPorJugador.has(jugadorId)) {
        resumenPorJugador.set(jugadorId, {
          puntos_totales: 0,
          rebotes_totales: 0,
          asistencias_totales: 0,
          partidos_jugados: 0,
        });
      }

      const resumen =
        resumenPorJugador.get(jugadorId)!;

      resumen.puntos_totales += Number(
        estadistica.puntos ?? 0
      );

      resumen.rebotes_totales += Number(
        estadistica.rebotes ?? 0
      );

      resumen.asistencias_totales += Number(
        estadistica.asistencias ?? 0
      );

      resumen.partidos_jugados += 1;
    }
  );

  const jugadoresConEstadisticas: JugadorConEstadisticas[] =
    (jugadoresData as Jugador[]).map(
      (jugador) => {
        const resumen =
          resumenPorJugador.get(
            Number(jugador.id)
          );

        const partidosJugados =
          resumen?.partidos_jugados ?? 0;

        const puntosTotales =
          resumen?.puntos_totales ?? 0;

        const rebotesTotales =
          resumen?.rebotes_totales ?? 0;

        const asistenciasTotales =
          resumen?.asistencias_totales ?? 0;

        return {
          ...jugador,

          puntos_totales: puntosTotales,

          rebotes_totales: rebotesTotales,

          asistencias_totales:
            asistenciasTotales,

          partidos_jugados:
            partidosJugados,

          ppg:
            partidosJugados > 0
              ? Number(
                  (
                    puntosTotales /
                    partidosJugados
                  ).toFixed(1)
                )
              : 0,

          rpg:
            partidosJugados > 0
              ? Number(
                  (
                    rebotesTotales /
                    partidosJugados
                  ).toFixed(1)
                )
              : 0,

          apg:
            partidosJugados > 0
              ? Number(
                  (
                    asistenciasTotales /
                    partidosJugados
                  ).toFixed(1)
                )
              : 0,
        };
      }
    );

  const jugadoresActivos =
    jugadoresConEstadisticas.filter(
      (jugador) =>
        jugador.partidos_jugados > 0
    );

  const mvp = [...jugadoresActivos].sort(
    (a, b) => {
      if (b.ppg !== a.ppg) {
        return b.ppg - a.ppg;
      }

      if (b.rpg !== a.rpg) {
        return b.rpg - a.rpg;
      }

      return b.apg - a.apg;
    }
  )[0];

  if (!mvp) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-slate-100 pt-32 p-4 md:p-10">
          <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl p-10 text-center">
            <h1 className="text-3xl font-black">
              Aún no hay estadísticas registradas
            </h1>

            <p className="text-gray-600 mt-3">
              Registra estadísticas individuales
              desde el panel administrativo
              para seleccionar el MVP.
            </p>
          </div>
        </main>
      </>
    );
  }

  const foto =
    mvp.foto &&
    (
      mvp.foto.startsWith("http") ||
      mvp.foto.startsWith("/")
    )
      ? mvp.foto
      : "/logos/LIBAVIME.png";

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-100 pt-32 p-4 md:p-10">
        <div className="max-w-5xl mx-auto">

          <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 text-center">

            <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl py-4 px-6 mb-8">
              <h1 className="text-3xl md:text-5xl font-black text-white">
                🏆 MVP LIBAVIME 2026
              </h1>
            </div>

            <Image
              src={foto}
              alt={mvp.nombre}
              width={220}
              height={220}
              className="mx-auto rounded-full border-4 border-white object-cover"
            />

            <h2 className="text-3xl md:text-4xl font-black mt-6">
              {mvp.nombre}
            </h2>

            <p className="text-xl md:text-2xl mt-2">
              {mvp.equipo ?? "Sin equipo"}
            </p>

            <p className="text-gray-500 mt-2">
              {mvp.partidos_jugados} partidos
              jugados
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">

              <div className="bg-blue-100 rounded-2xl p-6">
                <p className="text-sm">
                  🏀 Puntos
                </p>

                <p className="text-5xl font-black text-blue-900">
                  {mvp.ppg}
                </p>

                <p>PPG</p>

                <p className="text-sm text-gray-600 mt-2">
                  {mvp.puntos_totales} puntos
                  totales
                </p>
              </div>

              <div className="bg-green-100 rounded-2xl p-6">
                <p className="text-sm">
                  💪 Rebotes
                </p>

                <p className="text-5xl font-black text-green-700">
                  {mvp.rpg}
                </p>

                <p>RPG</p>

                <p className="text-sm text-gray-600 mt-2">
                  {mvp.rebotes_totales} rebotes
                  totales
                </p>
              </div>

              <div className="bg-red-100 rounded-2xl p-6">
                <p className="text-sm">
                  🎯 Asistencias
                </p>

                <p className="text-5xl font-black text-red-700">
                  {mvp.apg}
                </p>

                <p>APG</p>

                <p className="text-sm text-gray-600 mt-2">
                  {mvp.asistencias_totales} asistencias
                  totales
                </p>
              </div>

            </div>

            {mvp.slug && (
              <Link
                href={`/jugadores/${mvp.slug}`}
                className="inline-block mt-10 bg-blue-900 text-white px-8 py-4 rounded-full font-bold hover:bg-blue-800 transition"
              >
                Ver Perfil Completo
              </Link>
            )}

          </div>
        </div>
      </main>
    </>
  );
}