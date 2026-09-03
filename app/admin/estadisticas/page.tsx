"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Jugador = {
  id: number;
  nombre: string;
  equipo: string | null;
};

type Partido = {
  id: number;
  equipo_local: string | null;
  equipo_visitante: string | null;
  fecha: string | null;
};

type Estadistica = {
  jugador_id: number;
  puntos: number;
  rebotes: number;
  asistencias: number;
};

export default function AdminEstadisticasPage() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [partidoSeleccionado, setPartidoSeleccionado] =
    useState<string>("");

  const [estadisticas, setEstadisticas] = useState<
    Record<number, Estadistica>
  >({});

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setMensaje("");

    const { data: partidosData, error: partidosError } =
      await supabase
        .from("partidos")
        .select(
          "id, equipo_local, equipo_visitante, fecha"
        )
        .order("fecha", { ascending: false });

    const { data: jugadoresData, error: jugadoresError } =
      await supabase
        .from("jugadores")
        .select("id, nombre, equipo")
        .order("nombre");

    console.log("PARTIDOS:", partidosData);
    console.log("JUGADORES:", jugadoresData);
    console.log("ERROR PARTIDOS:", partidosError);
    console.log("ERROR JUGADORES:", jugadoresError);

    if (partidosError) {
      console.error(partidosError);
      setMensaje(
        `Error al cargar partidos: ${partidosError.message}`
      );
    }

    if (jugadoresError) {
      console.error(jugadoresError);
      setMensaje(
        `Error al cargar jugadores: ${jugadoresError.message}`
      );
    }

    if (!partidosError) {
      setPartidos(
        (partidosData ?? []) as Partido[]
      );
    }

    if (!jugadoresError) {
      setJugadores(
        (jugadoresData ?? []) as Jugador[]
      );
    }

    setCargando(false);
  }

  async function seleccionarPartido(partidoId: string) {
    setPartidoSeleccionado(partidoId);
    setMensaje("");
    setEstadisticas({});

    if (!partidoId) {
      return;
    }

    const { data, error } = await supabase
      .from("estadisticas_partido")
      .select(
        "jugador_id, puntos, rebotes, asistencias"
      )
      .eq("partido_id", Number(partidoId));

    if (error) {
      console.error(error);
      setMensaje(
        `Error al cargar estadísticas: ${error.message}`
      );
      return;
    }

    const estadisticasExistentes: Record<
      number,
      Estadistica
    > = {};

    (data ?? []).forEach((estadistica) => {
      estadisticasExistentes[
        Number(estadistica.jugador_id)
      ] = {
        jugador_id: Number(
          estadistica.jugador_id
        ),
        puntos: Number(estadistica.puntos) || 0,
        rebotes: Number(estadistica.rebotes) || 0,
        asistencias:
          Number(estadistica.asistencias) || 0,
      };
    });

    setEstadisticas(estadisticasExistentes);
  }

  const partidoActual = partidos.find(
    (partido) =>
      partido.id === Number(partidoSeleccionado)
  );

  const normalizarTexto = (texto: string | null) =>
    (texto ?? "")
      .trim()
      .toLowerCase();

  const jugadoresDelPartido = partidoActual
    ? jugadores.filter((jugador) => {
        const equipoJugador = normalizarTexto(
          jugador.equipo
        );

        const equipoLocal = normalizarTexto(
          partidoActual.equipo_local
        );

        const equipoVisitante = normalizarTexto(
          partidoActual.equipo_visitante
        );

        return (
          equipoJugador === equipoLocal ||
          equipoJugador === equipoVisitante
        );
      })
    : [];

  function actualizarEstadistica(
    jugadorId: number,
    campo: "puntos" | "rebotes" | "asistencias",
    valor: string
  ) {
    const numero =
      valor === "" ? 0 : Number(valor);

    setEstadisticas((actual) => ({
      ...actual,

      [jugadorId]: {
        jugador_id: jugadorId,

        puntos:
          campo === "puntos"
            ? numero
            : actual[jugadorId]?.puntos ?? 0,

        rebotes:
          campo === "rebotes"
            ? numero
            : actual[jugadorId]?.rebotes ?? 0,

        asistencias:
          campo === "asistencias"
            ? numero
            : actual[jugadorId]?.asistencias ?? 0,
      },
    }));
  }

  async function guardarEstadisticas() {
    if (!partidoSeleccionado) {
      setMensaje(
        "Selecciona un partido primero."
      );
      return;
    }

    if (jugadoresDelPartido.length === 0) {
      setMensaje(
        "No hay jugadores asociados a los equipos de este partido."
      );
      return;
    }

    setGuardando(true);
    setMensaje("");

    const datos = jugadoresDelPartido.map(
      (jugador) => ({
        partido_id: Number(
          partidoSeleccionado
        ),

        jugador_id: jugador.id,

        puntos: Number(
          estadisticas[jugador.id]?.puntos ?? 0
        ),

        rebotes: Number(
          estadisticas[jugador.id]?.rebotes ?? 0
        ),

        asistencias: Number(
          estadisticas[jugador.id]?.asistencias ?? 0
        ),
      })
    );

    const { error } = await supabase
      .from("estadisticas_partido")
      .upsert(datos, {
        onConflict: "partido_id,jugador_id",
      });

    if (error) {
      console.error(error);

      setMensaje(
        `Error al guardar: ${error.message}`
      );

      setGuardando(false);
      return;
    }

    setMensaje(
      "¡Estadísticas guardadas correctamente!"
    );

    await seleccionarPartido(
      partidoSeleccionado
    );

    setGuardando(false);
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 md:p-10">
        <p className="text-center font-bold">
          Cargando...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-10">
      <div className="max-w-6xl mx-auto">

        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10">

          <h1 className="text-3xl md:text-4xl font-black text-blue-900">
            📊 Registrar Estadísticas
          </h1>

          <p className="text-gray-600 mt-2">
            Selecciona un partido e introduce las estadísticas de los jugadores.
          </p>

          <div className="mt-8">

            <label className="block font-bold mb-2">
              Seleccionar partido
            </label>

            <select
              value={partidoSeleccionado}
              onChange={(e) =>
                seleccionarPartido(e.target.value)
              }
              className="w-full border-2 border-slate-200 rounded-xl p-4 font-bold"
            >
              <option value="">
                Selecciona un partido
              </option>

              {partidos.map((partido) => (
                <option
                  key={partido.id}
                  value={partido.id}
                >
                  {partido.equipo_local} vs{" "}
                  {partido.equipo_visitante} —{" "}
                  {partido.fecha}
                </option>
              ))}

            </select>

          </div>

          {partidoSeleccionado && partidoActual && (

            <div className="mt-8">

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">

                <h2 className="text-xl font-black text-blue-900">
                  🏀 {partidoActual.equipo_local}
                  <span className="mx-3 text-red-600">
                    VS
                  </span>
                  {partidoActual.equipo_visitante}
                </h2>

                <p className="text-gray-600 mt-2">
                  📅 {partidoActual.fecha}
                </p>

              </div>

              <p className="font-bold text-blue-900 mb-4">
                Jugadores del partido
              </p>

              {jugadoresDelPartido.length === 0 ? (

                <div className="bg-red-50 border border-red-200 rounded-xl p-6">

                  <p className="font-bold text-red-700">
                    ⚠️ No se encontraron jugadores para este partido.
                  </p>

                  <p className="text-red-600 mt-2">
                    Equipo local:{" "}
                    {partidoActual.equipo_local}
                  </p>

                  <p className="text-red-600">
                    Equipo visitante:{" "}
                    {partidoActual.equipo_visitante}
                  </p>

                  <p className="text-gray-600 mt-4">
                    Revisa que el nombre del equipo asignado a cada jugador
                    sea exactamente el mismo que el nombre de los equipos
                    registrados en el partido.
                  </p>

                </div>

              ) : (

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[700px]">

                    <thead>
                      <tr className="border-b-2 bg-slate-50">

                        <th className="p-3 text-left">
                          Jugador
                        </th>

                        <th className="p-3 text-center">
                          Equipo
                        </th>

                        <th className="p-3 text-center">
                          Puntos
                        </th>

                        <th className="p-3 text-center">
                          Rebotes
                        </th>

                        <th className="p-3 text-center">
                          Asistencias
                        </th>

                      </tr>
                    </thead>

                    <tbody>

                      {jugadoresDelPartido.map(
                        (jugador) => (

                          <tr
                            key={jugador.id}
                            className="border-b"
                          >

                            <td className="p-3 font-bold">
                              {jugador.nombre}
                            </td>

                            <td className="p-3 text-center">
                              {jugador.equipo}
                            </td>

                            <td className="p-3 text-center">

                              <input
                                type="number"
                                min="0"
                                value={
                                  estadisticas[jugador.id]
                                    ?.puntos ?? 0
                                }
                                onChange={(e) =>
                                  actualizarEstadistica(
                                    jugador.id,
                                    "puntos",
                                    e.target.value
                                  )
                                }
                                className="w-20 border rounded-lg p-2 text-center"
                              />

                            </td>

                            <td className="p-3 text-center">

                              <input
                                type="number"
                                min="0"
                                value={
                                  estadisticas[jugador.id]
                                    ?.rebotes ?? 0
                                }
                                onChange={(e) =>
                                  actualizarEstadistica(
                                    jugador.id,
                                    "rebotes",
                                    e.target.value
                                  )
                                }
                                className="w-20 border rounded-lg p-2 text-center"
                              />

                            </td>

                            <td className="p-3 text-center">

                              <input
                                type="number"
                                min="0"
                                value={
                                  estadisticas[jugador.id]
                                    ?.asistencias ?? 0
                                }
                                onChange={(e) =>
                                  actualizarEstadistica(
                                    jugador.id,
                                    "asistencias",
                                    e.target.value
                                  )
                                }
                                className="w-20 border rounded-lg p-2 text-center"
                              />

                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}

              {jugadoresDelPartido.length > 0 && (

                <button
                  onClick={guardarEstadisticas}
                  disabled={guardando}
                  className="mt-8 w-full bg-blue-900 text-white p-4 rounded-xl font-black hover:bg-blue-800 disabled:opacity-50 transition"
                >
                  {guardando
                    ? "Guardando..."
                    : "💾 Guardar estadísticas"}
                </button>

              )}

            </div>

          )}

          {mensaje && (

            <p className="text-center mt-6 font-bold">
              {mensaje}
            </p>

          )}

        </div>

      </div>
    </div>
  );
}