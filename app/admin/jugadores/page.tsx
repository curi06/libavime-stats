"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
export default function AdminJugadores() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [numero, setNumero] = useState("");
  const [posicion, setPosicion] = useState("");
  const [equipo, setEquipo] = useState("");
  const [foto, setFoto] = useState("");
  const [ppg, setPpg] = useState("");
  const [rpg, setRpg] = useState("");
  const [apg, setApg] = useState("");
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
useEffect(() => {
  verificarSesion();
  cargarJugadores();
}, []);

async function verificarSesion() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    router.push("/login");
  }
}

async function cargarJugadores() {
  const { data, error } = await supabase
    .from("jugadores")
    .select("*")
    .order("nombre");

  if (!error && data) {
    setJugadores(data);
  }
}

function editarJugador(jugador: any) {
  setEditandoId(jugador.id);

  setNombre(jugador.nombre || "");
  setSlug(jugador.slug || "");
  setNumero(String(jugador.numero || ""));
  setPosicion(jugador.posicion || "");
  setEquipo(jugador.equipo || "");
  setFoto(jugador.foto || "");
  setPpg(String(jugador.ppg || ""));
  setRpg(String(jugador.rpg || ""));
  setApg(String(jugador.apg || ""));
}

  async function guardarJugador(e: React.FormEvent) {
    e.preventDefault();
    if (editandoId) {
  const { error } = await supabase
    .from("jugadores")
    .update({
      nombre,
      slug,
      numero: Number(numero),
      posicion,
      equipo,
      foto,
      ppg: Number(ppg),
      rpg: Number(rpg),
      apg: Number(apg),
    })
    .eq("id", editandoId);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Jugador actualizado");

  setEditandoId(null);

  cargarJugadores();
  setNombre("");
setSlug("");
setNumero("");
setPosicion("");
setEquipo("");
setFoto("");
setPpg("");
setRpg("");
setApg("");

  return;
}

    const { error } = await supabase
      .from("jugadores")
      .insert([
        {
          nombre,
          slug,
          numero: Number(numero),
          posicion,
          equipo,
          foto,
          ppg: Number(ppg),
          rpg: Number(rpg),
          apg: Number(apg),
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Jugador guardado correctamente");
    cargarJugadores();

    setNombre("");
    setSlug("");
    setNumero("");
    setPosicion("");
    setEquipo("");
    setFoto("");
    setPpg("");
    setRpg("");
    setApg("");
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
    alert(error.message);
    return;
  }

  cargarJugadores();
}
  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">

      <div className="max-w-4xl mx-auto">
        <div className="flex justify-end mb-4">
  <button
    onClick={async () => {
      await supabase.auth.signOut();
      router.push("/login");
    }}
    className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700"
  >
    🚪 Cerrar sesión
  </button>
</div>

        <h1 className="text-4xl font-black text-blue-900 mb-2 text-center">
  ⚙️ Panel Administrativo LIBAVIME
</h1>

<h2 className="text-2xl font-bold text-center mb-8 text-gray-700">
  👤 Gestión de Jugadores
</h2>
        <div className="bg-white rounded-2xl shadow-lg p-8">

          <h2 className="text-2xl font-bold mb-6">
  {editandoId
    ? "✏️ Editando Jugador"
    : "➕ Nuevo Jugador"}
</h2>

          <form onSubmit={guardarJugador} className="grid gap-4">

            <input
  type="text"
  placeholder="Nombre"
  value={nombre}
  onChange={(e) => setNombre(e.target.value)}
  className="border rounded-xl p-3"
/>

            <input
  type="text"
  placeholder="Slug"
  value={slug}
  onChange={(e) => setSlug(e.target.value)}
  className="border rounded-xl p-3"
/>

            <input
  type="number"
  placeholder="Número"
  value={numero}
  onChange={(e) => setNumero(e.target.value)}
  className="border rounded-xl p-3"
/>

            <input
  type="text"
  placeholder="Posición"
  value={posicion}
  onChange={(e) => setPosicion(e.target.value)}
  className="border rounded-xl p-3"
/>
            <input
  type="text"
  placeholder="Equipo"
  value={equipo}
  onChange={(e) => setEquipo(e.target.value)}
  className="border rounded-xl p-3"
/>
            <input
  type="text"
  placeholder="Ruta de Foto"
  value={foto}
  onChange={(e) => setFoto(e.target.value)}
  className="border rounded-xl p-3"
/>

            <input
  type="number"
  step="0.1"
  placeholder="PPG"
  value={ppg}
  onChange={(e) => setPpg(e.target.value)}
  className="border rounded-xl p-3"
/>

            <input
  type="number"
  step="0.1"
  placeholder="RPG"
  value={rpg}
  onChange={(e) => setRpg(e.target.value)}
  className="border rounded-xl p-3"
/>

            <input
  type="number"
  step="0.1"
  placeholder="APG"
  value={apg}
  onChange={(e) => setApg(e.target.value)}
  className="border rounded-xl p-3"
/>

            <button
  type="submit"
  className="
    w-full
    bg-gradient-to-r
    from-blue-900
    to-blue-700
    text-white
    p-4
    rounded-xl
    font-bold
    text-lg
    shadow-lg
    transition-all
    duration-300
    hover:scale-105
    hover:shadow-2xl
    hover:from-blue-800
    hover:to-blue-600
    active:scale-95
  "
>
  {editandoId
  ? "✏️ Actualizar Jugador"
  : "💾 Guardar Jugador"}
</button>

          </form>
          <hr className="my-8" />

<h2 className="text-2xl font-bold mb-4">
  Jugadores Registrados
</h2>

<div className="space-y-3">
  {jugadores.map((jugador) => (
    <div
      key={jugador.id}
      className="border rounded-xl p-4 bg-slate-50"
    >
      <p className="font-bold text-lg">
        {jugador.nombre}
      </p>

      <p>
        Equipo: {jugador.equipo}
      </p>

      <p>
        Posición: {jugador.posicion}
      </p>

     <p>
  PPG: {jugador.ppg}
</p>

<button
  type="button"
  onClick={() => {
    setEditandoId(jugador.id);

    setNombre(jugador.nombre);
    setSlug(jugador.slug);
    setNumero(String(jugador.numero));
    setPosicion(jugador.posicion);
    setEquipo(jugador.equipo);
    setFoto(jugador.foto);
    setPpg(String(jugador.ppg));
    setRpg(String(jugador.rpg));
    setApg(String(jugador.apg));
  }}
  className="
    mt-3
    mr-2
    bg-amber-500
    text-white
    px-4
    py-2
    rounded-lg
    font-bold
    hover:bg-amber-600
    transition
  "
>
  ✏️ Editar
</button>

<button
  onClick={() => eliminarJugador(jugador.id)}
  className="
    mt-3
    bg-red-600
    text-white
    px-4
    py-2
    rounded-lg
    font-bold
    hover:bg-red-700
    transition
  "
>
  🗑️ Eliminar
</button>

</div>
  ))}
</div>

        </div>

      </div>

    </main>
  );
}