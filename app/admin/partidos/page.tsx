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
    const { data } = await supabase
      .from("equipos")
      .select("*")
      .order("nombre");

    if (data) setEquipos(data);
  }

  async function cargarPartidos() {
  const { data, error } = await supabase
    .from("partidos")
    .select("*")
    .order("fecha");

  console.log("PARTIDOS:", data);
  console.log("ERROR:", error);

  if (data) {
    setPartidos(data);
  }
}

  function limpiarFormulario() {
    setEquipoLocal("");
    setEquipoVisitante("");
    setFecha("");
    setHora("");
    setCancha("");
  }

  async function guardarPartido(
    e: React.FormEvent
  ) {
    e.preventDefault();

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
        alert(error.message);
        return;
      }

      alert("Partido actualizado");

      setEditandoId(null);
      limpiarFormulario();
      cargarPartidos();

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
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Partido guardado");

    limpiarFormulario();
    cargarPartidos();
  }

  function editarPartido(partido: any) {
    setEditandoId(partido.id);

    setEquipoLocal(partido.equipo_local);
    setEquipoVisitante(
      partido.equipo_visitante
    );
    setFecha(partido.fecha);
    setHora(partido.hora);
    setCancha(partido.cancha);
  }

  async function eliminarPartido(id: number) {
    const confirmar = confirm(
      "¿Eliminar este partido?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("partidos")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setEditandoId(null);
    limpiarFormulario();
    cargarPartidos();
  }
  async function registrarResultado(
  partido: any
) {
  const local = prompt(
    "Puntos Equipo Local"
  );

  const visitante = prompt(
    "Puntos Equipo Visitante"
  );

  if (
    local === null ||
    visitante === null
  )
    return;

  const { error } = await supabase
    .from("partidos")
    .update({
      puntos_local: Number(local),
      puntos_visitante: Number(
        visitante
      ),
      estado: "Finalizado",
    })
    .eq("id", partido.id);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Resultado guardado");

  cargarPartidos();
}

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">

      <div className="max-w-5xl mx-auto">

        <h1 className="text-4xl font-black text-blue-900 text-center mb-2">
          ⚙️ Panel Administrativo LIBAVIME
        </h1>

        <h2 className="text-2xl font-bold text-center mb-8">
          📅 Gestión de Partidos
        </h2>

        <div className="bg-white rounded-2xl shadow-lg p-8">

          <h3 className="text-2xl font-bold mb-6">
            {editandoId
              ? "✏️ Editando Partido"
              : "➕ Nuevo Partido"}
          </h3>

          <form
            onSubmit={guardarPartido}
            className="grid gap-4"
          >

            <select
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
              value={equipoVisitante}
              onChange={(e) =>
                setEquipoVisitante(
                  e.target.value
                )
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
  type="text"
  placeholder="Hora (Ej: 1:30 PM)"
  value={hora}
  onChange={(e) =>
    setHora(e.target.value)
  }
  className="border rounded-xl p-3"
/>

           <input
  type="text"
  placeholder="Fecha (Ej: 2026-06-15)"
  value={fecha}
  onChange={(e) =>
    setFecha(e.target.value)
  }
  className="border rounded-xl p-3"
/>

            <input
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
              className="
                bg-blue-900
                text-white
                p-4
                rounded-xl
                font-bold
              "
            >
              {editandoId
                ? "✏️ Actualizar Partido"
                : "💾 Guardar Partido"}
            </button>

          </form>

          <hr className="my-8" />

          <h3 className="text-2xl font-bold mb-4">
            Partidos Registrados
          </h3>

          <div className="space-y-3">

            {partidos.map((partido) => (
              <div
                key={partido.id}
                className="border rounded-xl p-4 bg-slate-50"
              >
                <p className="font-bold">
                  {partido.equipo_local}
                  {" vs "}
                  {partido.equipo_visitante}
                </p>

                <p>
                  📅 {partido.fecha}
                </p>

                <p>
                  🕐 {partido.hora}
                </p>
                <p>
  📍 {partido.cancha}
</p>

<p className="font-bold text-green-700">
  🏆 {partido.puntos_local} - {partido.puntos_visitante}
</p>

<p>
  Estado: {partido.estado}
</p>

                <div className="flex flex-col md:flex-row gap-2 mt-3">

                  <button
                    type="button"
                    onClick={() =>
                      editarPartido(partido)
                    }
                    className="bg-amber-500 text-white px-4 py-2 rounded-lg font-bold"
                  >
                    ✏️ Editar
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      eliminarPartido(
                        partido.id
                      )
                    }
                    className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold"
                  >
                    🗑️ Eliminar
                  </button>
                
                  <button
  type="button"
  onClick={() =>
    registrarResultado(partido)
  }
  className="
    bg-green-600
    text-white
    px-4
    py-2
    rounded-lg
    font-bold
  "
>
  🏆 Resultado
</button>

            

                </div>

              </div>
            ))}

          </div>

        </div>

      </div>

    </main>
  );
}