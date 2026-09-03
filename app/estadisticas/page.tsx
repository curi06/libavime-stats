"use client";

import Navbar from "../components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Estadisticas() {
  const [tabla, setTabla] = useState<any[]>([]);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);

    await Promise.all([
      cargarTabla(),
      cargarJugadores(),
    ]);

    setCargando(false);
  }

  async function cargarJugadores() {
    const [
      { data: jugadoresData, error: jugadoresError },
      { data: estadisticasData, error: estadisticasError },
    ] = await Promise.all([
      supabase
        .from("jugadores")
        .select("*")
        .order("nombre"),

      supabase
        .from("estadisticas_partido")
        .select(`
          jugador_id,
          puntos,
          rebotes,
          asistencias,
          partido_id
        `),
    ]);

    if (jugadoresError) {
      console.error(
        "Error cargando jugadores:",
        jugadoresError
      );
      return;
    }

    if (estadisticasError) {
      console.error(
        "Error cargando estadísticas:",
        estadisticasError
      );
      return;
    }

    const estadisticasPorJugador = new Map<
      number,
      {
        puntos: number;
        rebotes: number;
        asistencias: number;
        partidos: number;
      }
    >();

    (estadisticasData ?? []).forEach(
      (estadistica: any) => {
        const jugadorId = Number(
          estadistica.jugador_id
        );

        const actual =
          estadisticasPorJugador.get(jugadorId) ?? {
            puntos: 0,
            rebotes: 0,
            asistencias: 0,
            partidos: 0,
          };

        actual.puntos += Number(
          estadistica.puntos ?? 0
        );

        actual.rebotes += Number(
          estadistica.rebotes ?? 0
        );

        actual.asistencias += Number(
          estadistica.asistencias ?? 0
        );

        actual.partidos += 1;

        estadisticasPorJugador.set(
          jugadorId,
          actual
        );
      }
    );

    const jugadoresConEstadisticas =
      (jugadoresData ?? []).map(
        (jugador: any) => {
          const estadisticas =
            estadisticasPorJugador.get(
              Number(jugador.id)
            ) ?? {
              puntos: 0,
              rebotes: 0,
              asistencias: 0,
              partidos: 0,
            };

          const partidosJugados =
            estadisticas.partidos;

          return {
            ...jugador,

            puntosTotales:
              estadisticas.puntos,

            rebotesTotales:
              estadisticas.rebotes,

            asistenciasTotales:
              estadisticas.asistencias,

            partidosJugados,

            ppg:
              partidosJugados > 0
                ? Number(
                    (
                      estadisticas.puntos /
                      partidosJugados
                    ).toFixed(1)
                  )
                : 0,

            rpg:
              partidosJugados > 0
                ? Number(
                    (
                      estadisticas.rebotes /
                      partidosJugados
                    ).toFixed(1)
                  )
                : 0,

            apg:
              partidosJugados > 0
                ? Number(
                    (
                      estadisticas.asistencias /
                      partidosJugados
                    ).toFixed(1)
                  )
                : 0,
          };
        }
      );

    setJugadores(
      jugadoresConEstadisticas
    );
  }

  async function cargarTabla() {
    const { data, error } = await supabase
      .from("partidos")
      .select("*")
      .eq("estado", "Finalizado");

    if (error) {
      console.error(
        "Error cargando tabla:",
        error
      );
      return;
    }

    if (!data) return;

    const posiciones: any = {};

    data.forEach((partido: any) => {
      const local =
        partido.equipo_local ||
        "LOCAL VACÍO";

      const visitante =
        partido.equipo_visitante ||
        "VISITANTE VACÍO";

      if (!posiciones[local]) {
        posiciones[local] = {
          equipo: local,
          pj: 0,
          pg: 0,
          pp: 0,
          pts: 0,
        };
      }

      if (!posiciones[visitante]) {
        posiciones[visitante] = {
          equipo: visitante,
          pj: 0,
          pg: 0,
          pp: 0,
          pts: 0,
        };
      }

      posiciones[local].pj++;
      posiciones[visitante].pj++;

      if (
        Number(partido.puntos_local) >
        Number(partido.puntos_visitante)
      ) {
        posiciones[local].pg++;
        posiciones[local].pts += 2;

        posiciones[visitante].pp++;
        posiciones[visitante].pts += 1;
      } else if (
        Number(partido.puntos_visitante) >
        Number(partido.puntos_local)
      ) {
        posiciones[visitante].pg++;
        posiciones[visitante].pts += 2;

        posiciones[local].pp++;
        posiciones[local].pts += 1;
      } else {
        // Empate
        posiciones[local].pts += 1;
        posiciones[visitante].pts += 1;
      }
    });

    const tablaFinal = Object.values(
      posiciones
    ).sort(
      (a: any, b: any) => {
        if (b.pts !== a.pts) {
          return b.pts - a.pts;
        }

        return b.pg - a.pg;
      }
    );

    setTabla(tablaFinal);
  }

  const lideresPuntos = [...jugadores]
    .filter(
      (jugador) =>
        jugador.partidosJugados > 0
    )
    .sort(
      (a, b) =>
        b.ppg - a.ppg
    )
    .slice(0, 10);

  const lideresRebotes = [...jugadores]
    .filter(
      (jugador) =>
        jugador.partidosJugados > 0
    )
    .sort(
      (a, b) =>
        b.rpg - a.rpg
    )
    .slice(0, 10);

  const lideresAsistencias = [...jugadores]
    .filter(
      (jugador) =>
        jugador.partidosJugados > 0
    )
    .sort(
      (a, b) =>
        b.apg - a.apg
    )
    .slice(0, 10);

  const mvp =
    lideresPuntos.length > 0
      ? lideresPuntos[0]
      : null;

  if (cargando) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-slate-100 pt-24 flex items-center justify-center">
          <h1 className="text-2xl font-bold text-blue-900">
            Cargando estadísticas...
          </h1>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-100 pt-24 p-4 md:p-10">
        <div className="max-w-6xl mx-auto">

          <h1 className="text-4xl font-black text-center text-blue-900 mb-10">
            📊 Estadísticas LIBAVIME
          </h1>

          {mvp && (
            <Link
              href={`/jugadores/${mvp.slug}`}
              className="block bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-2xl p-8 shadow-lg mb-10 hover:scale-[1.01] transition"
            >
              <div className="flex flex-col md:flex-row items-center justify-center gap-6">

                <Image
                  src={
                    mvp.foto?.startsWith("http") ||
                    mvp.foto?.startsWith("/")
                      ? mvp.foto
                      : "/logos/LIBAVIME.png"
                  }
                  alt={mvp.nombre}
                  width={160}
                  height={160}
                  className="rounded-full border-4 border-white object-cover"
                />

                <div className="text-center">

                  <h2 className="text-4xl font-black">
                    🏆 MVP DE LA LIGA
                  </h2>

                  <p className="text-3xl font-bold mt-4">
                    {mvp.nombre}
                  </p>

                  <p className="text-xl">
                    {mvp.equipo}
                  </p>

                  <p className="text-5xl font-black mt-3">
                    {mvp.ppg} PPG
                  </p>

                  <p className="mt-3 text-lg">
                    {mvp.partidosJugados} partido
                    {mvp.partidosJugados !== 1
                      ? "s"
                      : ""}{" "}
                    jugado
                    {mvp.partidosJugados !== 1
                      ? "s"
                      : ""}
                  </p>

                  <Image
                    src="/logos/LIBAVIME.png"
                    alt="LIBAVIME"
                    width={64}
                    height={64}
                    className="mx-auto mt-4"
                  />

                </div>

              </div>
            </Link>
          )}

          {!mvp && (
            <div className="bg-white rounded-2xl shadow p-8 text-center mb-10">
              <p className="text-xl font-bold text-gray-600">
                Aún no hay estadísticas registradas.
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6">

            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-2xl font-bold mb-4">
                🏀 Top Anotadores
              </h2>

              {lideresPuntos.length > 0 ? (
                lideresPuntos.map(
                  (jugador, index) => (
                    <p
                      key={jugador.id}
                      className="py-2 border-b last:border-b-0"
                    >
                      <span className="font-bold">
                        {index + 1}.
                      </span>{" "}
                      {jugador.nombre} -{" "}
                      <span className="font-bold text-blue-900">
                        {jugador.ppg} PPG
                      </span>
                    </p>
                  )
                )
              ) : (
                <p className="text-gray-500">
                  No hay estadísticas todavía.
                </p>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-2xl font-bold mb-4">
                💪 Top Reboteadores
              </h2>

              {lideresRebotes.length > 0 ? (
                lideresRebotes.map(
                  (jugador, index) => (
                    <p
                      key={jugador.id}
                      className="py-2 border-b last:border-b-0"
                    >
                      <span className="font-bold">
                        {index + 1}.
                      </span>{" "}
                      {jugador.nombre} -{" "}
                      <span className="font-bold text-green-700">
                        {jugador.rpg} RPG
                      </span>
                    </p>
                  )
                )
              ) : (
                <p className="text-gray-500">
                  No hay estadísticas todavía.
                </p>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-2xl font-bold mb-4">
                🎯 Top Asistidores
              </h2>

              {lideresAsistencias.length > 0 ? (
                lideresAsistencias.map(
                  (jugador, index) => (
                    <p
                      key={jugador.id}
                      className="py-2 border-b last:border-b-0"
                    >
                      <span className="font-bold">
                        {index + 1}.
                      </span>{" "}
                      {jugador.nombre} -{" "}
                      <span className="font-bold text-red-700">
                        {jugador.apg} APG
                      </span>
                    </p>
                  )
                )
              ) : (
                <p className="text-gray-500">
                  No hay estadísticas todavía.
                </p>
              )}
            </div>

          </div>

          <div className="bg-white p-6 rounded-xl shadow mt-8">

            <h2 className="text-2xl font-bold mb-4">
              🏆 Tabla de Posiciones
            </h2>

            {tabla.length > 0 ? (
              <div className="overflow-x-auto">

                <table className="w-full text-left min-w-[600px]">

                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="p-3">Pos</th>
                      <th className="p-3">Equipo</th>
                      <th className="p-3">PJ</th>
                      <th className="p-3">PG</th>
                      <th className="p-3">PP</th>
                      <th className="p-3">PTS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {tabla.map(
                      (equipo, index) => (
                        <tr
                          key={equipo.equipo}
                          className="border-b"
                        >
                          <td className="p-3 font-bold">
                            {index + 1}
                          </td>

                          <td className="p-3 font-bold">
                            {equipo.equipo}
                          </td>

                          <td className="p-3">
                            {equipo.pj}
                          </td>

                          <td className="p-3">
                            {equipo.pg}
                          </td>

                          <td className="p-3">
                            {equipo.pp}
                          </td>

                          <td className="p-3 font-black text-blue-900">
                            {equipo.pts}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>

                </table>

              </div>
            ) : (
              <p className="text-gray-500">
                Todavía no hay partidos finalizados.
              </p>
            )}

          </div>

        </div>
      </main>
    </>
  );
}