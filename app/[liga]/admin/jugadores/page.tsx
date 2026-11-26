"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Jugador = {
  id: string;
  nombre: string;
  slug: string;
  numero: number | null;
  posicion: string | null;
  equipo: string | null;
  foto: string | null;
};

export default function AdminJugadores() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [numero, setNumero] = useState("");
  const [posicion, setPosicion] = useState("");
  const [equipo, setEquipo] = useState("");
  const [foto, setFoto] = useState("");

  const [subiendo, setSubiendo] = useState(false);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    iniciar();
  }, []);

  async function iniciar() {
    await verificarSesion();
    await cargarJugadores();
  }

  async function verificarSesion() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/login");
    }
  }

  async function cargarJugadores() {
    setCargando(true);

    const { data, error } = await supabase
      .from("jugadores")
      .select(`
        id,
        nombre,
        slug,
        numero,
        posicion,
        equipo,
        foto
      `)
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error al cargar jugadores:", error);
      alert(error.message);
      setCargando(false);
      return;
    }

    setJugadores(data ?? []);
    setCargando(false);
  }

  function limpiarFormulario() {
    setNombre("");
    setSlug("");
    setNumero("");
    setPosicion("");
    setEquipo("");
    setFoto("");
    setEditandoId(null);
  }

  async function subirFoto(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const archivo = e.target.files?.[0];

    if (!archivo) return;

    setSubiendo(true);

    const extension = archivo.name.split(".").pop();

    const nombreArchivo =
      `${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("Jugadores")
      .upload(nombreArchivo, archivo);

    if (uploadError) {
      console.error("Error al subir imagen:", uploadError);
      alert(uploadError.message);
      setSubiendo(false);
      return;
    }

    const { data } = supabase.storage
      .from("Jugadores")
      .getPublicUrl(nombreArchivo);

    setFoto(data.publicUrl);
    setSubiendo(false);
  }

  function editarJugador(jugador: Jugador) {
    setEditandoId(jugador.id);

    setNombre(jugador.nombre ?? "");
    setSlug(jugador.slug ?? "");
    setNumero(
      jugador.numero !== null &&
      jugador.numero !== undefined
        ? String(jugador.numero)
        : ""
    );
    setPosicion(jugador.posicion ?? "");
    setEquipo(jugador.equipo ?? "");
    setFoto(jugador.foto ?? "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function guardarJugador(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!nombre || !slug || !equipo) {
      alert(
        "Completa al menos el nombre, slug y equipo."
      );
      return;
    }

    const datosJugador = {
      nombre,
      slug,
      numero: numero ? Number(numero) : null,
      posicion,
      equipo,
      foto,
    };

    if (editandoId) {
      const { error } = await supabase
        .from("jugadores")
        .update(datosJugador)
        .eq("id", editandoId);

      if (error) {
        console.error("Error al actualizar:", error);
        alert(error.message);
        return;
      }

      alert("✏️ Jugador actualizado correctamente.");

      limpiarFormulario();
      await cargarJugadores();

      return;
    }

    const { error } = await supabase
      .from("jugadores")
      .insert([datosJugador]);

    if (error) {
      console.error("Error al guardar:", error);
      alert(error.message);
      return;
    }

    alert("👤 Jugador guardado correctamente.");

    limpiarFormulario();
    await cargarJugadores();
  }

  async function eliminarJugador(id: string) {
    const confirmar = confirm(
      "¿Deseas eliminar este jugador?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("jugadores")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error al eliminar jugador:", error);
      alert(error.message);
      return;
    }

    alert("🗑️ Jugador eliminado correctamente.");

    limpiarFormulario();
    await cargarJugadores();
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-100 p-6 pt-32">
        <p className="text-center font-bold">
          Cargando jugadores...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 pt-32 md:p-10">
      <div className="max-w-4xl mx-auto">

        <div className="flex justify-end mb-6">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="bg-red-600 text-white px-5 py-3 rounded-xl hover:bg-red-700 font-bold"
          >
            🚪 Cerrar sesión
          </button>
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-blue-900 mb-2 text-center">
          ⚙️ Panel Administrativo LIBAVIME
        </h1>

        <h2 className="text-xl md:text-2xl font-bold text-center mb-8 text-gray-700">
          👤 Gestión de Jugadores
        </h2>

        <div className="bg-white rounded-2xl shadow-lg p-5 md:p-8">

          <h2 className="text-xl md:text-2xl font-bold mb-6">
            {editandoId
              ? "✏️ Editando Jugador"
              : "➕ Nuevo Jugador"}
          </h2>

          <form
            onSubmit={guardarJugador}
            className="grid gap-4"
          >
            <input
              required
              type="text"
              placeholder="Nombre completo"
              value={nombre}
              onChange={(e) =>
                setNombre(e.target.value)
              }
              className="border rounded-xl p-3"
            />

            <input
              required
              type="text"
              placeholder="Slug (ejemplo: juan-perez)"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value)
              }
              className="border rounded-xl p-3"
            />

            <input
              type="number"
              placeholder="Número"
              value={numero}
              onChange={(e) =>
                setNumero(e.target.value)
              }
              className="border rounded-xl p-3"
            />

            <input
              type="text"
              placeholder="Posición"
              value={posicion}
              onChange={(e) =>
                setPosicion(e.target.value)
              }
              className="border rounded-xl p-3"
            />

            <input
              required
              type="text"
              placeholder="Equipo"
              value={equipo}
              onChange={(e) =>
                setEquipo(e.target.value)
              }
              className="border rounded-xl p-3"
            />

            <div className="border rounded-xl p-4">
              <label className="font-bold block mb-2">
                📸 Foto del Jugador
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={subirFoto}
              />

              {subiendo && (
                <p className="text-blue-600 mt-2">
                  Subiendo imagen...
                </p>
              )}

              {foto && (
                <img
                  src={foto}
                  alt="Vista previa"
                  className="mt-4 w-32 h-32 object-cover rounded-xl border"
                />
              )}
            </div>

            <button
              type="submit"
              disabled={subiendo}
              className="w-full bg-blue-900 text-white p-4 rounded-xl font-bold text-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {subiendo
                ? "📤 Subiendo imagen..."
                : editandoId
                ? "✏️ Actualizar Jugador"
                : "💾 Guardar Jugador"}
            </button>

            {editandoId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                className="w-full bg-slate-200 text-slate-800 p-4 rounded-xl font-bold hover:bg-slate-300"
              >
                Cancelar edición
              </button>
            )}
          </form>

          <hr className="my-8" />

          <h2 className="text-xl md:text-2xl font-bold mb-4">
            Jugadores Registrados ({jugadores.length})
          </h2>

          {jugadores.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No hay jugadores registrados.
            </p>
          ) : (
            <div className="space-y-3">
              {jugadores.map((jugador) => (
                <div
                  key={jugador.id}
                  className="border rounded-xl p-4 bg-slate-50"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                    {jugador.foto && (
                      <img
                        src={jugador.foto}
                        alt={jugador.nombre}
                        className="w-20 h-20 rounded-full object-cover border"
                      />
                    )}

                    <div className="flex-1">
                      <p className="font-black text-lg">
                        {jugador.nombre}
                      </p>

                      <p>
                        Equipo: {jugador.equipo}
                      </p>

                      <p>
                        Posición: {jugador.posicion || "No registrada"}
                      </p>

                      <p>
                        Número: {jugador.numero ?? "No registrado"}
                      </p>
                    </div>

                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() =>
                        editarJugador(jugador)
                      }
                      className="bg-amber-500 text-white px-4 py-3 rounded-lg font-bold hover:bg-amber-600"
                    >
                      ✏️ Editar
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        eliminarJugador(jugador.id)
                      }
                      className="bg-red-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-red-700"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}