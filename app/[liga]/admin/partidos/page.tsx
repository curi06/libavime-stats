"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminPartidos() {
  const router = useRouter();

  const [equipoLocal, setEquipoLocal] = useState("");
  const [equipoVisitante, setEquipoVisitante] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [cancha, setCancha] = useState("");

  const [equipos, setEquipos] = useState<any[]>([]);
  const [partidos, setPartidos] = useState<any[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  useEffect(() => {
    verificarSesion();
    cargarEquipos();
    cargarPartidos();
  }, []);

  async function verificarSesion() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
    }
  }

  async function cargarEquipos() {
    const { data, error } = await supabase
      .from("equipos")
      .select("*")
      .order("nombre");

    if (error) {
      console.error("Error al cargar equipos:", error);
      return;
    }

    if (data) {
      setEquipos(data);
    }
  }

  async function cargarPartidos() {
    const { data, error } = await supabase
      .from("partidos")
      .select("*")
      .order("fecha", { ascending: true });

    if (error) {
      console.error("Error al cargar partidos:", error);
      return;
    }

    setPartidos(data ?? []);
  }

  function limpiarFormulario() {
    setEquipoLocal("");
    setEquipoVisitante("");
    setFecha("");
    setHora("");
    setCancha("");
    setEditandoId(null);
  }

  async function guardarPartido(e: React.FormEvent) {
    e.preventDefault();

    if (
      !equipoLocal ||
      !equipoVisitante ||
      !fecha ||
      !hora ||
      !cancha
    ) {
      alert("Completa todos los campos.");
      return;
    }

    if (equipoLocal === equipoVisitante) {
      alert(
        "El equipo local y el equipo visitante no pueden ser el mismo."
      );
      return;
    }

    if (editandoId) {
      const { error } = await supabase
        .from("partidos")
        .update({
          equipo_local: equipoLocal,
          equipo_visitante: equipoVisitante,
          fecha,
          hora,
          cancha,
        })
        .eq("id", editandoId);

      if (error) {
        console.error("Error al actualizar partido:", error);
        alert(error.message);
        return;
      }

      alert("✏️ Partido actualizado correctamente.");

      limpiarFormulario();
      await cargarPartidos();

      return;
    }

    const { error } = await supabase
      .from("partidos")
      .insert([
        {
          equipo_local: equipoLocal,
          equipo_visitante: equipoVisitante,
          fecha,
          hora,
          cancha,
          estado: "Programado",
        },
      ]);

    if (error) {
      console.error("Error al guardar partido:", error);
      alert(error.message);
      return;
    }

    alert("📅 Partido guardado correctamente.");

    limpiarFormulario();
    await cargarPartidos();
  }

  function editarPartido(partido: any) {
    setEditandoId(partido.id);
    setEquipoLocal(partido.equipo_local ?? "");
    setEquipoVisitante(partido.equipo_visitante ?? "");
    setFecha(partido.fecha ?? "");
    setHora(partido.hora ?? "");
    setCancha(partido.cancha ?? "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function eliminarPartido(id: number) {
    const confirmar = confirm(
      "¿Estás seguro de que deseas eliminar este partido?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("partidos")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error al eliminar partido:", error);
      alert(error.message);
      return;
    }

    alert("🗑️ Partido eliminado correctamente.");

    limpiarFormulario();
    await cargarPartidos();
  }

  async function registrarResultado(partido: any) {
    const local = prompt(
      `Puntos de ${partido.equipo_local}`,
      partido.puntos_local?.toString() ?? "0"
    );

    if (local === null) return;

    const visitante = prompt(
      `Puntos de ${partido.equipo_visitante}`,
      partido.puntos_visitante?.toString() ?? "0"
    );

    if (visitante === null) return;

    const puntosLocal = Number(local);
    const puntosVisitante = Number(visitante);

    if (
      !Number.isFinite(puntosLocal) ||
      !Number.isFinite(puntosVisitante) ||
      puntosLocal < 0 ||
      puntosVisitante < 0
    ) {
      alert("Introduce resultados válidos.");
      return;
    }

    const { error } = await supabase
      .from("partidos")
      .update({
        puntos_local: puntosLocal,
        puntos_visitante: puntosVisitante,
        estado: "Finalizado",
      })
      .eq("id", partido.id);

    if (error) {
      console.error("Error al guardar resultado:", error);
      alert(error.message);
      return;
    }

    alert("🏆 Resultado guardado correctamente.");

    await cargarPartidos();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 pt-32 md:p-10">
      <div className="max-w-5xl mx-auto">

        <div className="flex justify-end mb-6">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-3 rounded-xl"
          >
            🚪 Cerrar sesión
          </button>
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-blue-900 text-center mb-2">
          ⚙️ Panel Administrativo LIBAVIME
        </h1>

        <h2 className="text-xl md:text-2xl font-bold text-center mb-8">
          📅 Gestión de Partidos
        </h2>

        <div className="bg-white rounded-2xl shadow-lg p-5 md:p-8">

          <h3 className="text-xl md:text-2xl font-bold mb-6">
            {editandoId
              ? "✏️ Editando Partido"
              : "➕ Nuevo Partido"}
          </h3>

          <form
            onSubmit={guardarPartido}
            className="grid gap-4"
          >
            <select
              required
              value={equipoLocal}
              onChange={(e) =>
                setEquipoLocal(e.target.value)
              }
              className="border rounded-xl p-3"
            >
              <option value="">
                Equipo Local
              </option>

              {equipos.map((equipo) => (
                <option
                  key={equipo.id}
                  value={equipo.nombre}
                >
                  {equipo.nombre}
                </option>
              ))}
            </select>

            <select
              required
              value={equipoVisitante}
              onChange={(e) =>
                setEquipoVisitante(e.target.value)
              }
              className="border rounded-xl p-3"
            >
              <option value="">
                Equipo Visitante
              </option>

              {equipos.map((equipo) => (
                <option
                  key={equipo.id}
                  value={equipo.nombre}
                >
                  {equipo.nombre}
                </option>
              ))}
            </select>

            <input
              required
              type="date"
              value={fecha}
              onChange={(e) =>
                setFecha(e.target.value)
              }
              className="border rounded-xl p-3"
            />

            <input
              required
              type="text"
              placeholder="Hora (Ej: 1:30 PM)"
              value={hora}
              onChange={(e) =>
                setHora(e.target.value)
              }
              className="border rounded-xl p-3"
            />

            <input
              required
              type="text"
              placeholder="Cancha"
              value={cancha}
              onChange={(e) =>
                setCancha(e.target.value)
              }
              className="border rounded-xl p-3"
            />

            <button
              type="submit"
              className="bg-blue-900 hover:bg-blue-800 text-white p-4 rounded-xl font-bold"
            >
              {editandoId
                ? "✏️ Actualizar Partido"
                : "💾 Guardar Partido"}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 p-4 rounded-xl font-bold"
              >
                Cancelar edición
              </button>
            )}

          </form>

          <hr className="my-8" />

          <h3 className="text-xl md:text-2xl font-bold mb-4">
            Partidos Registrados
          </h3>

          {partidos.length === 0 ? (
            <p className="text-center text-gray-500 py-6">
              No hay partidos registrados.
            </p>
          ) : (
            <div className="space-y-3">

              {partidos.map((partido) => {
                const finalizado =
                  partido.estado === "Finalizado";

                return (
                  <div
                    key={partido.id}
                    className="border rounded-xl p-4 bg-slate-50"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

                      <div>
                        <p className="font-black text-lg md:text-xl">
                          {partido.equipo_local}

                          <span className="mx-2 text-red-600 font-black">
                            VS
                          </span>

                          {partido.equipo_visitante}
                        </p>

                        <p className="mt-2">
                          📅 {partido.fecha}
                        </p>

                        <p>
                          🕐 {partido.hora}
                        </p>

                        <p>
                          📍 {partido.cancha}
                        </p>

                        {finalizado ? (
                          <>
                            <p className="font-black text-green-700 text-xl mt-3">
                              🏆 {partido.puntos_local} -{" "}
                              {partido.puntos_visitante}
                            </p>

                            <p className="font-bold text-green-600 mt-1">
                              FINALIZADO
                            </p>
                          </>
                        ) : (
                          <p className="font-bold text-yellow-600 mt-3">
                            ⏳ PROGRAMADO
                          </p>
                        )}
                      </div>

                      <span
                        className={
                          finalizado
                            ? "inline-block bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold"
                            : "inline-block bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full font-bold"
                        }
                      >
                        {partido.estado || "Programado"}
                      </span>

                    </div>

                    <div className="flex flex-col md:flex-row gap-2 mt-4">

                      <button
                        type="button"
                        onClick={() =>
                          editarPartido(partido)
                        }
                        className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-lg font-bold"
                      >
                        ✏️ Editar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          registrarResultado(partido)
                        }
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-bold"
                      >
                        🏆 {finalizado
                          ? "Editar Resultado"
                          : "Registrar Resultado"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          eliminarPartido(partido.id)
                        }
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-bold"
                      >
                        🗑️ Eliminar
                      </button>

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </div>

      </div>
    </main>
  );
}