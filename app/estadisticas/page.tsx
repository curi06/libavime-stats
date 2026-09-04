"use client";

import Navbar from "../components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Estadisticas() {
  const [tabla, setTabla] = useState<any[]>([]);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setErrorCarga("");

    try {
      await Promise.all([
        cargarTabla(),
        cargarJugadores(),
      ]);
    } catch (error) {
      console.error(
        "Error general cargando estadísticas:",
        error
      );

      setErrorCarga(
        "Ocurrió un error al cargar las estadísticas."
      );
    } finally {
      setCargando(false);
    }
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

      throw jugadoresError;
    }

    if (estadisticasError) {
      console.error(
        "Error cargando estadísticas:",
        estadisticasError
      );

      throw estadisticasError;
    }

    const estadisticasPorJugador = new Map<
      number,
      {
        puntos: number;
        rebotes: number;
        asistencias: number;
        partidos: Set<string>;
      }
    >();

    (estadisticasData ?? []).forEach(
      (estadistica: any) => {
        const jugadorId = Number(
          estadistica.jugador_id
        );

        if (!jugadorId) return;

        const actual =
          estadisticasPorJugador.get(jugadorId) ?? {
            puntos: 0,
            rebotes: 0,
            asistencias: 0,
            partidos: new Set<string>(),
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

        if (
          estadistica.partido_id !== null &&
          estadistica.partido_id !== undefined
        ) {
          actual.partidos.add(
            String(estadistica.partido_id)
          );
        }

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
              partidos: new Set<string>(),
            };

          const partidosJugados =
            estadisticas.partidos.size;

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

      throw error;
    }

    if (!data) {
      setTabla([]);
      return;
    }

    const posiciones: any = {};

    data.forEach((partido: any) => {
      const local =
        partido.equipo_local ??
        partido.local ??
        "";

      const visitante =
        partido.equipo_visitante ??
        partido.visitante ??
        "";

      const puntosLocal =
        partido.puntos_local ??
        partido.puntosLocal;

      const puntosVisitante =
        partido.puntos_visitante ??
        partido.puntosVisitante;

      if (
        !local ||
        !visitante ||
        puntosLocal === null ||
        puntosLocal === undefined ||
        puntosVisitante === null ||
        puntosVisitante === undefined
      ) {
        return;
      }

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
        Number(puntosLocal) >
        Number(puntosVisitante)
      ) {
        posiciones[local].pg++;
        posiciones[local].pts += 2;

        posiciones[visitante].pp++;
        posiciones[visitante].pts += 1;
      } else if (
        Number(puntosVisitante) >
        Number(puntosLocal)
      ) {
        posiciones[visitante].pg++;
        posiciones[visitante].pts += 2;

        posiciones[local].pp++;
        posiciones[local].pts += 1;
      } else {
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

        if (b.pg !== a.pg) {
          return b.pg - a.pg;
        }

        return a.equipo.localeCompare(
          b.equipo
        );
      }
    );

    setTabla(tablaFinal);
  }

  const jugadoresOrdenados = [...jugadores].sort(
    (a, b) => {
      const puntos =
        Number(b.ppg) - Number(a.ppg);

      if (puntos !== 0) {
        return puntos;
      }

      const rebotes =
        Number(b.rpg) - Number(a.rpg);

      if (rebotes !== 0) {
        return rebotes;
      }

      const asistencias =
        Number(b.apg) - Number(a.apg);

      if (asistencias !== 0) {
        return asistencias;
      }

      return String(
        a.nombre ?? ""
      ).localeCompare(
        String(b.nombre ?? "")
      );
    }
  );

    async function exportarPDF() {
  try {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const fecha = new Date().toLocaleDateString("es-DO");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(20, 50, 100);

    doc.text(
      "ESTADÍSTICAS OFICIALES LIBAVIME",
      148.5,
      18,
      {
        align: "center",
      }
    );

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);

    doc.text(
      "Liga de Baloncesto Villa Mella",
      148.5,
      25,
      {
        align: "center",
      }
    );

    doc.setDrawColor(20, 50, 100);

    doc.line(
      12,
      30,
      285,
      30
    );

    const filas = jugadoresOrdenados.map(
      (jugador, index) => [
        String(index + 1),
        String(jugador.nombre ?? ""),
        String(jugador.equipo ?? ""),
        String(jugador.partidosJugados ?? 0),
        String(jugador.puntosTotales ?? 0),
        Number(jugador.ppg ?? 0).toFixed(1),
        String(jugador.rebotesTotales ?? 0),
        Number(jugador.rpg ?? 0).toFixed(1),
        String(jugador.asistenciasTotales ?? 0),
        Number(jugador.apg ?? 0).toFixed(1),
      ]
    );

    autoTable(doc, {
      startY: 38,

      head: [[
        "POS",
        "JUGADOR",
        "EQUIPO",
        "JJ",
        "PTS",
        "PPG",
        "REB",
        "RPG",
        "AST",
        "APG",
      ]],

      body: filas,

      theme: "grid",

      styles: {
        fontSize: 8,
        cellPadding: 2,
      },

      headStyles: {
        fillColor: [20, 50, 100],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
      },

      margin: {
        top: 38,
        right: 12,
        bottom: 20,
        left: 12,
      },

      didDrawPage: (data) => {
        const pagina =
          data.pageNumber;

        if (pagina > 1) {
          doc.setFont(
            "helvetica",
            "bold"
          );

          doc.setFontSize(16);
          doc.setTextColor(
            20,
            50,
            100
          );

          doc.text(
            "ESTADÍSTICAS OFICIALES LIBAVIME",
            148.5,
            18,
            {
              align: "center",
            }
          );
        }

        doc.setFontSize(8);
        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setTextColor(
          90,
          90,
          90
        );

        doc.text(
          `Fecha: ${fecha}`,
          12,
          290
        );

        doc.text(
          "Diseñado por: Emmi De La Cruz",
          148.5,
          290,
          {
            align: "center",
          }
        );

        doc.text(
          `Página ${pagina}`,
          285,
          290,
          {
            align: "right",
          }
        );
      },
    });

    doc.save(
      `Estadisticas_LIBAVIME_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`
    );

  } catch (error) {
    console.error(
      "Error al generar el PDF:",
      error
    );

    alert(
      "No se pudo generar el PDF."
    );
  }
}

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

          {/* TÍTULO */}

          <h1 className="text-3xl md:text-4xl font-black text-center text-blue-900 mb-8">
            📊 Estadísticas LIBAVIME
          </h1>

          {/* MENSAJE DE ERROR */}

          {errorCarga && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center font-medium">
              {errorCarga}
            </div>
          )}

          {/* ESTADÍSTICAS DE LOS JUGADORES */}

          <section className="mb-10">

            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-4xl font-black text-blue-900">
                🏀 Estadísticas de Jugadores
              </h2>
              <button
  type="button"
  onClick={exportarPDF}
  disabled={jugadoresOrdenados.length === 0}
  className="
    mt-4
    inline-flex
    items-center
    justify-center
    gap-2
    rounded-xl
    bg-blue-900
    px-6
    py-3
    font-bold
    text-white
    shadow-lg
    transition
    hover:bg-blue-800
    disabled:cursor-not-allowed
    disabled:opacity-50
  "
>
  📄 Exportar estadísticas en PDF
</button>

              <p className="text-slate-600 mt-2">
                Ranking completo de{" "}
                {jugadoresOrdenados.length} jugadores
                {" "}de LIBAVIME
              </p>

              <p className="text-sm text-slate-500 mt-1">
                Desplázate para ver todos los jugadores
              </p>
            </div>

            {jugadoresOrdenados.length > 0 ? (

              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

                <div
                  className="
                    max-h-[650px]
                    md:max-h-[720px]
                    overflow-auto
                  "
                >

                  <table className="w-full min-w-[900px] text-left">

                    <thead className="sticky top-0 z-20">

                      <tr className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow">

                        <th className="p-4 text-center whitespace-nowrap">
                          Pos
                        </th>

                        <th className="p-4 whitespace-nowrap">
                          Jugador
                        </th>

                        <th className="p-4 whitespace-nowrap">
                          Equipo
                        </th>

                        <th className="p-4 text-center whitespace-nowrap">
                          JJ
                        </th>

                        <th className="p-4 text-center whitespace-nowrap">
                          PTS
                        </th>

                        <th className="p-4 text-center whitespace-nowrap">
                          PPG
                        </th>

                        <th className="p-4 text-center whitespace-nowrap">
                          REB
                        </th>

                        <th className="p-4 text-center whitespace-nowrap">
                          RPG
                        </th>

                        <th className="p-4 text-center whitespace-nowrap">
                          AST
                        </th>

                        <th className="p-4 text-center whitespace-nowrap">
                          APG
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {jugadoresOrdenados.map(
                        (jugador, index) => {
                          const foto =
                            jugador.foto &&
                            (
                              jugador.foto.startsWith("http") ||
                              jugador.foto.startsWith("/")
                            )
                              ? jugador.foto
                              : "/logos/LIBAVIME.png";

                          const hrefJugador =
                            jugador.slug
                              ? `/jugadores/${jugador.slug}`
                              : "#";

                          return (
                            <tr
                              key={
                                jugador.id ??
                                `${jugador.nombre}-${index}`
                              }
                              className="
                                border-b
                                last:border-b-0
                                hover:bg-blue-50
                                transition
                              "
                            >

                              {/* POSICIÓN */}

                              <td className="p-4 text-center font-black text-blue-900 text-lg">

                                {index === 0
                                  ? "🥇"
                                  : index === 1
                                  ? "🥈"
                                  : index === 2
                                  ? "🥉"
                                  : index + 1}

                              </td>

                              {/* JUGADOR */}

                              <td className="p-4">

                                {jugador.slug ? (

                                  <Link
                                    href={hrefJugador}
                                    className="
                                      flex
                                      items-center
                                      gap-3
                                      font-bold
                                      text-slate-900
                                      hover:text-blue-700
                                      transition
                                    "
                                  >

                                    <Image
                                      src={foto}
                                      alt={
                                        jugador.nombre ??
                                        "Jugador LIBAVIME"
                                      }
                                      width={48}
                                      height={48}
                                      className="
                                        rounded-full
                                        object-cover
                                        border
                                        border-slate-200
                                        shrink-0
                                      "
                                    />

                                    <span className="whitespace-nowrap">
                                      {jugador.nombre}
                                    </span>

                                  </Link>

                                ) : (

                                  <div
                                    className="
                                      flex
                                      items-center
                                      gap-3
                                      font-bold
                                      text-slate-900
                                    "
                                  >

                                    <Image
                                      src={foto}
                                      alt={
                                        jugador.nombre ??
                                        "Jugador LIBAVIME"
                                      }
                                      width={48}
                                      height={48}
                                      className="
                                        rounded-full
                                        object-cover
                                        border
                                        border-slate-200
                                        shrink-0
                                      "
                                    />

                                    <span className="whitespace-nowrap">
                                      {jugador.nombre}
                                    </span>

                                  </div>

                                )}

                              </td>

                              {/* EQUIPO */}

                              <td className="p-4 text-slate-600 font-medium whitespace-nowrap">

                                {jugador.equipo || "—"}

                              </td>

                              {/* JJ */}

                              <td className="p-4 text-center font-bold">

                                {jugador.partidosJugados}

                              </td>

                              {/* PUNTOS TOTALES */}

                              <td className="p-4 text-center font-bold">

                                {jugador.puntosTotales}

                              </td>

                              {/* PPG */}

                              <td className="p-4 text-center font-black text-blue-900">

                                {Number(
                                  jugador.ppg ?? 0
                                ).toFixed(1)}

                              </td>

                              {/* REBOTES */}

                              <td className="p-4 text-center font-bold">

                                {jugador.rebotesTotales}

                              </td>

                              {/* RPG */}

                              <td className="p-4 text-center font-black text-green-700">

                                {Number(
                                  jugador.rpg ?? 0
                                ).toFixed(1)}

                              </td>

                              {/* ASISTENCIAS */}

                              <td className="p-4 text-center font-bold">

                                {jugador.asistenciasTotales}

                              </td>

                              {/* APG */}

                              <td className="p-4 text-center font-black text-red-700">

                                {Number(
                                  jugador.apg ?? 0
                                ).toFixed(1)}

                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            ) : (

              <div className="bg-white rounded-2xl shadow p-8 text-center">

                <p className="text-xl font-bold text-gray-600">
                  No hay jugadores registrados todavía.
                </p>

              </div>

            )}

            {/* LEYENDA */}

            <div className="mt-5 flex flex-wrap justify-center gap-3 text-sm font-medium text-slate-600">

              <span>
                📅 JJ: Partidos jugados
              </span>

              <span>•</span>

              <span>
                🏀 PTS: Puntos totales
              </span>

              <span>•</span>

              <span>
                💪 REB: Rebotes totales
              </span>

              <span>•</span>

              <span>
                🎯 AST: Asistencias totales
              </span>

              <span>•</span>

              <span>
                📊 PPG / RPG / APG:
                {" "}Promedios por partido
              </span>

            </div>

          </section>

          {/* TABLA DE POSICIONES */}

          <div className="bg-white p-6 rounded-2xl shadow-xl mt-8">

            <h2 className="text-2xl md:text-3xl font-black text-blue-900 mb-5">
              🏆 Tabla de Posiciones
            </h2>

            {tabla.length > 0 ? (

              <div className="overflow-x-auto">

                <table className="w-full text-left min-w-[600px]">

                  <thead>

                    <tr className="border-b bg-blue-900 text-white">

                      <th className="p-4 text-center">
                        Pos
                      </th>

                      <th className="p-4">
                        Equipo
                      </th>

                      <th className="p-4 text-center">
                        PJ
                      </th>

                      <th className="p-4 text-center">
                        PG
                      </th>

                      <th className="p-4 text-center">
                        PP
                      </th>

                      <th className="p-4 text-center">
                        PTS
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {tabla.map(
                      (equipo, index) => (

                        <tr
                          key={equipo.equipo}
                          className="
                            border-b
                            hover:bg-slate-50
                            transition
                          "
                        >

                          <td className="p-4 text-center font-bold">
                            {index + 1}
                          </td>

                          <td className="p-4 font-bold">
                            {equipo.equipo}
                          </td>

                          <td className="p-4 text-center">
                            {equipo.pj}
                          </td>

                          <td className="p-4 text-center">
                            {equipo.pg}
                          </td>

                          <td className="p-4 text-center">
                            {equipo.pp}
                          </td>

                          <td className="p-4 text-center font-black text-blue-900">
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