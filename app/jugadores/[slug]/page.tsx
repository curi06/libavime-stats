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
  estado?: "jugó" | "no_jugo" | "lesionado" | null;
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
      partido_id,
      estado
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

  const idsPartidos = [...new Set(
    estadisticas
      .map((fila) => fila.partido_id)
      .filter((id): id is number => id !== null)
  )];

  const [{ data: temporadaActual }, { data: partidosTemporada }] = await Promise.all([
    supabase
      .from("temporadas")
      .select("id, nombre, anio")
      .order("anio", { ascending: false })
      .limit(1)
      .maybeSingle(),
    idsPartidos.length > 0
      ? supabase
          .from("partidos")
          .select("id, fase, temporada_id")
          .in("id", idsPartidos)
      : Promise.resolve({ data: [] as { id: number; fase: string | null; temporada_id: number | null }[] }),
  ]);

  const partidosPorId = new Map(
    (partidosTemporada ?? []).map((partido: any) => [Number(partido.id), partido])
  );

  const estadisticasTemporadaActual = estadisticas.filter((fila) => {
    const partido = partidosPorId.get(Number(fila.partido_id)) as any;
    return (
      partido &&
      Number(partido.temporada_id) === Number(temporadaActual?.id) &&
      fila.estado !== "no_jugo" &&
      fila.estado !== "lesionado"
    );
  });

  function calcularEstadisticasFase(fase: "serie_regular" | "finales") {
    const filas = estadisticas.filter((fila) => {
      const partido = partidosPorId.get(Number(fila.partido_id)) as any;
      return (
        partido &&
        Number(partido.temporada_id) === Number(temporadaActual?.id) &&
        partido.fase === fase &&
        fila.estado !== "no_jugo" &&
        fila.estado !== "lesionado"
      );
    });

    const partidos = new Set(filas.map((fila) => fila.partido_id));
    const pj = partidos.size;
    const pts = filas.reduce((total, fila) => total + Number(fila.puntos ?? 0), 0);
    const reb = filas.reduce((total, fila) => total + Number(fila.rebotes ?? 0), 0);
    const ast = filas.reduce((total, fila) => total + Number(fila.asistencias ?? 0), 0);

    return {
      pj,
      pts,
      reb,
      ast,
      ppg: pj > 0 ? Number((pts / pj).toFixed(1)) : 0,
      rpg: pj > 0 ? Number((reb / pj).toFixed(1)) : 0,
      apg: pj > 0 ? Number((ast / pj).toFixed(1)) : 0,
    };
  }

  const estadisticasSerieRegularActual = calcularEstadisticasFase("serie_regular");
  const estadisticasFinalesActual = calcularEstadisticasFase("finales");

  // SUMAR ESTADÍSTICAS
  const puntosTotales = estadisticasTemporadaActual.reduce(
    (total, estadistica) =>
      total +
      Number(estadistica.puntos ?? 0),
    0
  );

  const rebotesTotales = estadisticasTemporadaActual.reduce(
    (total, estadistica) =>
      total +
      Number(estadistica.rebotes ?? 0),
    0
  );

  const asistenciasTotales = estadisticasTemporadaActual.reduce(
    (total, estadistica) =>
      total +
      Number(estadistica.asistencias ?? 0),
    0
  );

  // PARTIDOS JUGADOS
  const partidosUnicos = new Set(
    estadisticasTemporadaActual
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

      // COLOR DEL EQUIPO
const equipoNormalizado =
  jugador.equipo?.trim().toLowerCase();

let colorEquipo = "#1E3A8A";

if (equipoNormalizado === "vikingos") {
  colorEquipo = "#6B21A8";
} else if (equipoNormalizado === "gladiadores") {
  colorEquipo = "#15803D";
} else if (equipoNormalizado === "espartanos") {
  colorEquipo = "#FACC15";
} else if (equipoNormalizado === "titanes") {
  colorEquipo = "#DC2626";
}

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-100 pt-24 p-4 md:p-10 md:pt-20">
        <div className="max-w-5xl mx-auto">

          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

            {/* ENCABEZADO */}
            <div
  style={{ backgroundColor: colorEquipo }}
  className="text-white p-8 md:p-10 text-center"
>

             {/* FOTO DEL JUGADOR */}
<div
  className="
    relative
    mx-auto
    h-56
    w-56
    overflow-hidden
    rounded-full
    border-4
    border-white
    bg-white
    shadow-2xl
  "
>
  <Image
    src={foto}
    alt={jugador.nombre}
    fill
    sizes="224px"
    className="object-cover"
    style={{
      transform: "scale(1.45)",
      transformOrigin: "center center",
      objectPosition: "50% 20%",
    }}
  />
</div>

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
                📊 Estadísticas de {temporadaActual?.nombre ?? "la temporada"}
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

              {/* DESGLOSE DE LIBAVIME 2026 */}
              <section className="mt-12">
                <h3 className="mb-2 text-center text-2xl font-black text-blue-900">
                  🏆 {temporadaActual?.nombre ?? "Temporada actual"} · Estadísticas por fase
                </h3>
                <p className="mb-6 text-center text-sm text-slate-500">
                  Tus números de la serie regular y de las finales se muestran por separado.
                </p>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {[
                    { titulo: "🏀 Serie regular", datos: estadisticasSerieRegularActual, color: "blue" },
                    { titulo: "🏆 Finales", datos: estadisticasFinalesActual, color: "amber" },
                  ].map((fase) => (
                    <div key={fase.titulo} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <h4 className="mb-4 text-center text-xl font-black text-slate-800">{fase.titulo}</h4>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          ["PJ", fase.datos.pj],
                          ["PTS", fase.datos.pts],
                          ["REB", fase.datos.reb],
                          ["AST", fase.datos.ast],
                        ].map(([etiqueta, valor]) => (
                          <div key={String(etiqueta)} className="rounded-xl bg-white p-3 text-center shadow-sm">
                            <p className="text-xs font-bold text-slate-500">{etiqueta}</p>
                            <p className="mt-1 text-2xl font-black text-blue-900">{valor}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div><p className="text-xs text-slate-500">PPG</p><p className="font-black">{fase.datos.ppg}</p></div>
                        <div><p className="text-xs text-slate-500">RPG</p><p className="font-black">{fase.datos.rpg}</p></div>
                        <div><p className="text-xs text-slate-500">APG</p><p className="font-black">{fase.datos.apg}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

            </div>

          </div>

        </div>
      </main>
    </>
  );
}