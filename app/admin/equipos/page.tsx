"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminEquipos() {
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [logo, setLogo] = useState("");
  const [colorPrincipal, setColorPrincipal] = useState("");
  const [colorSecundario, setColorSecundario] = useState("");

  const [equipos, setEquipos] = useState<any[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);

  useEffect(() => {
    cargarEquipos();
  }, []);

  async function cargarEquipos() {
    const { data, error } = await supabase
      .from("equipos")
      .select("*")
      .order("nombre");

    if (!error && data) {
      setEquipos(data);
    }
  }

  async function guardarEquipo(e: React.FormEvent) {
    e.preventDefault();

    if (editandoId) {
      const { error } = await supabase
        .from("equipos")
        .update({
          nombre,
          slug,
          logo,
          color_principal: colorPrincipal,
          color_secundario: colorSecundario,
        })
        .eq("id", editandoId);

      if (error) {
        alert(error.message);
        return;
      }

      alert("Equipo actualizado");

      setEditandoId(null);
      limpiarFormulario();
      cargarEquipos();

      return;
    }

    const { error } = await supabase
      .from("equipos")
      .insert([
        {
          nombre,
          slug,
          logo,
          color_principal: colorPrincipal,
          color_secundario: colorSecundario,
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Equipo guardado");

    limpiarFormulario();
    cargarEquipos();
  }

  function limpiarFormulario() {
    setNombre("");
    setSlug("");
    setLogo("");
    setColorPrincipal("");
    setColorSecundario("");
  }
async function eliminarEquipo(id: number) {
  const confirmar = confirm(
    "¿Deseas eliminar este equipo?"
  );

  if (!confirmar) return;

  const { error } = await supabase
    .from("equipos")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  setEditandoId(null);

  alert("Formulario limpiado");

  limpiarFormulario();

  cargarEquipos();
}

  function editarEquipo(equipo: any) {
    setEditandoId(equipo.id);

    setNombre(equipo.nombre || "");
    setSlug(equipo.slug || "");
    setLogo(equipo.logo || "");
    setColorPrincipal(
      equipo.color_principal || ""
    );
    setColorSecundario(
      equipo.color_secundario || ""
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">

      <div className="max-w-4xl mx-auto">

        <h1 className="text-4xl font-black text-blue-900 text-center mb-2">
          ⚙️ Panel Administrativo LIBAVIME
        </h1>

        <h2 className="text-2xl font-bold text-center mb-8">
          🏀 Gestión de Equipos
        </h2>

        <div className="bg-white rounded-2xl shadow-lg p-8">

          <h3 className="text-2xl font-bold mb-6">
            {editandoId
              ? "✏️ Editando Equipo"
              : "➕ Nuevo Equipo"}
          </h3>

          <form
            onSubmit={guardarEquipo}
            className="grid gap-4"
          >

            <input
              type="text"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) =>
                setNombre(e.target.value)
              }
              className="border rounded-xl p-3"
            />

            <input
              type="text"
              placeholder="Slug"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value)
              }
              className="border rounded-xl p-3"
            />

            <input
              type="text"
              placeholder="Logo"
              value={logo}
              onChange={(e) =>
                setLogo(e.target.value)
              }
              className="border rounded-xl p-3"
            />

            <input
              type="text"
              placeholder="Color Principal"
              value={colorPrincipal}
              onChange={(e) =>
                setColorPrincipal(
                  e.target.value
                )
              }
              className="border rounded-xl p-3"
            />

            <input
              type="text"
              placeholder="Color Secundario"
              value={colorSecundario}
              onChange={(e) =>
                setColorSecundario(
                  e.target.value
                )
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
                ? "✏️ Actualizar Equipo"
                : "💾 Guardar Equipo"}
            </button>

          </form>

          <hr className="my-8" />

          <h3 className="text-2xl font-bold mb-4">
            Equipos Registrados
          </h3>

          <div className="space-y-3">

            {equipos.map((equipo) => (
              <div
                key={equipo.id}
                className="
                  border
                  rounded-xl
                  p-4
                  bg-slate-50
                "
              >
                <p className="font-bold text-lg">
                  {equipo.nombre}
                </p>

                <p>
                  Slug: {equipo.slug}
                </p>

                <div className="flex flex-col md:flex-row gap-2 mt-3">

                  <button
                    type="button"
                    onClick={() =>
                      editarEquipo(equipo)
                    }
                    className="
                      bg-amber-500
                      text-white
                      px-4
                      py-2
                      rounded-lg
                      font-bold
                    "
                  >
                    ✏️ Editar
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      eliminarEquipo(
                        equipo.id
                      )
                    }
                    className="
                      bg-red-600
                      text-white
                      px-4
                      py-2
                      rounded-lg
                      font-bold
                    "
                  >
                    🗑️ Eliminar
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