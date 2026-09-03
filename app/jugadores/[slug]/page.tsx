import { supabase } from "@/lib/supabase";
import Navbar from "../../components/Navbar";
import Image from "next/image";
import Link from "next/link";

type Jugador = {
  id: number;
  slug: string | null;
  nombre: string;
  numero: number | null;
  posicion: string | null;
  equipo: string | null;
  foto: string | null;
};

type EstadisticaPartido = {
  jugador_id: number;
  puntos: number | null;
  rebotes: number | null;
  asistencias: number | null;
  partido_id: number | null;
};

export default async function JugadorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // BUSCAR JUGADOR
  const { data: jugador, error: jugadorError } =
    await supabase
      .from("jugadores")
      .select("*")
      .eq("slug", slug)
      .single();

  if (jugadorError || !jugador) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-slate-100 pt-24 p-4 md:p-10">
          <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl p-10 text-center">
            <h1 className="text-3xl font-black">
              Jugador no encontrado
            </h1>

            <Link
              href="/jugadores"
              className="inline-block mt-6 bg-blue-900 text-white px-6 py-3 rounded-xl font-bold"
            >
              Volver a jugadores
            </Link>
          </div>
        </main>
      </>
    );
  }

  // BUSCAR TODAS LAS ESTADÍSTICAS DEL JUGADOR
  const {
    data: estadisticasData,
    error: estadisticasError,
  } = await supabase
    .from("estadisticas_partido")
    .select(`
      jugador_id,
      puntos,
      rebotes,
      asistencias,
      partido_id
    `)
    .eq("jugador_id", jugador.id);

  if (estadisticasError) {
    console.error(
      "Error cargando estadísticas:",
      estadisticasError
    );
  }

  const estadisticas =
    (estadisticasData ?? []) as EstadisticaPartido[];

  // SUMAR ESTADÍSTICAS
  const puntosTotales = estadisticas.reduce(
    (total, estadistica) =>
      total +
      Number(estadistica.puntos ?? 0),
    0
  );

  const rebotesTotales = estadisticas.reduce(
    (total, estadistica) =>
      total +
      Number(estadistica.rebotes ?? 0),
    0
  );

  const asistenciasTotales = estadisticas.reduce(
    (total, estadistica) =>
      total +
      Number(estadistica.asistencias ?? 0),
    0
  );

  // PARTIDOS JUGADOS
  const partidosUnicos = new Set(
    estadisticas
      .map(
        (estadistica) =>
          estadistica.partido_id
      )
      .filter(
        (partidoId) =>
          partidoId !== null
      )
  );

  const partidosJugados =
    partidosUnicos.size;

  // CALCULAR PROMEDIOS
  const ppg =
    partidosJugados > 0
      ? Number(
          (
            puntosTotales /
            partidosJugados
          ).toFixed(1)
        )
      : 0;

  const rpg =
    partidosJugados > 0
      ? Number(
          (
            rebotesTotales /
            partidosJugados
          ).toFixed(1)
        )
      : 0;

  const apg =
    partidosJugados > 0
      ? Number(
          (
            asistenciasTotales /
            partidosJugados
          ).toFixed(1)
        )
      : 0;

  // FOTO
  const foto =
    jugador.foto &&
    (
      jugador.foto.startsWith("http") ||
      jugador.foto.startsWith("/")
    )
      ? jugador.foto
      : "/logos/LIBAVIME.png";

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-100 pt-24 p-4 md:p-10">
        <div className="max-w-5xl mx-auto">

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

            {/* ENCABEZADO */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-8 md:p-10 text-center">

              <Image
                src={foto}
                alt={jugador.nombre}
                width={220}
                height={220}
                className="mx-auto rounded-full border-4 border-white object-cover"
              />

              <h1 className="text-4xl md:text-5xl font-black mt-6">
                {jugador.nombre}
              </h1>

              <p className="text-xl md:text-2xl mt-3">
                {jugador.equipo ??
                  "Sin equipo"}
              </p>

              {jugador.numero !== null && (
                <p className="text-lg mt-2">
                  #{jugador.numero}
                </p>
              )}

              {jugador.posicion && (
                <p className="text-lg mt-1">
                  {jugador.posicion}
                </p>
              )}

            </div>

            {/* ESTADÍSTICAS */}
            <div className="p-6 md:p-10">

              <h2 className="text-3xl font-black text-center text-blue-900 mb-8">
                📊 Estadísticas de la Temporada
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">

                {/* PARTIDOS */}
                <div className="bg-slate-100 rounded-2xl p-6 text-center">
                  <p className="text-sm text-gray-600">
                    🏀 Partidos
                  </p>

                  <p className="text-5xl font-black text-slate-800 mt-3">
                    {partidosJugados}
                  </p>

                  <p className="font-bold mt-2">
                    PJ
                  </p>
                </div>

                {/* PUNTOS */}
                <div className="bg-blue-100 rounded-2xl p-6 text-center">
                  <p className="text-sm text-blue-700">
                    🏀 Puntos
                  </p>

                  <p className="text-5xl font-black text-blue-900 mt-3">
                    {ppg}
                  </p>

                  <p className="font-bold mt-2">
                    PPG
                  </p>
                </div>

                {/* REBOTES */}
                <div className="bg-green-100 rounded-2xl p-6 text-center">
                  <p className="text-sm text-green-700">
                    💪 Rebotes
                  </p>

                  <p className="text-5xl font-black text-green-700 mt-3">
                    {rpg}
                  </p>

                  <p className="font-bold mt-2">
                    RPG
                  </p>
                </div>

                {/* ASISTENCIAS */}
                <div className="bg-red-100 rounded-2xl p-6 text-center">
                  <p className="text-sm text-red-700">
                    🎯 Asistencias
                  </p>

                  <p className="text-5xl font-black text-red-700 mt-3">
                    {apg}
                  </p>

                  <p className="font-bold mt-2">
                    APG
                  </p>
                </div>

              </div>

              {/* TOTALES */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">

                <div className="border rounded-2xl p-5 text-center">
                  <p className="text-gray-500">
                    Puntos Totales
                  </p>

                  <p className="text-3xl font-black text-blue-900">
                    {puntosTotales}
                  </p>
                </div>

                <div className="border rounded-2xl p-5 text-center">
                  <p className="text-gray-500">
                    Rebotes Totales
                  </p>

                  <p className="text-3xl font-black text-green-700">
                    {rebotesTotales}
                  </p>
                </div>

                <div className="border rounded-2xl p-5 text-center">
                  <p className="text-gray-500">
                    Asistencias Totales
                  </p>

                  <p className="text-3xl font-black text-red-700">
                    {asistenciasTotales}
                  </p>
                </div>

              </div>

            </div>

          </div>

        </div>
      </main>
    </>
  );
}