import { supabase } from "@/lib/supabase";
import Navbar from "../components/Navbar";
import Image from "next/image";
import Link from "next/link";

type Jugador = {
  id: number;
  slug: string | null;
  nombre: string;
  equipo: string | null;
  foto: string | null;
  ppg: number | null;
  rpg: number | null;
  apg: number | null;
};

export default async function MVPPage() {
  // Obtener jugadores directamente con sus estadísticas
  const { data: jugadoresData, error } = await supabase
    .from("jugadores")
    .select(`
      id,
      slug,
      nombre,
      equipo,
      foto,
      ppg,
      rpg,
      apg
    `)
    .order("ppg", {
      ascending: false,
    });

  // Si ocurre un error
  if (error) {
    console.error("ERROR MVP:", error);

    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-slate-100 pt-24 p-4 md:p-10">
          <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl p-10 text-center">
            <h1 className="text-3xl font-black">
              Error cargando el MVP
            </h1>

            <p className="text-red-600 mt-4">
              {error.message}
            </p>
          </div>
        </main>
      </>
    );
  }

  // Si no hay jugadores
  if (!jugadoresData || jugadoresData.length === 0) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-slate-100 pt-24 p-4 md:p-10">
          <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-2xl p-10 text-center">
            <h1 className="text-3xl font-black">
              No hay jugadores disponibles
            </h1>
          </div>
        </main>
      </>
    );
  }

  // Convertir estadísticas a números
  const jugadores: Jugador[] = jugadoresData.map(
    (jugador: any) => ({
      ...jugador,
      ppg: Number(jugador.ppg ?? 0),
      rpg: Number(jugador.rpg ?? 0),
      apg: Number(jugador.apg ?? 0),
    })
  );

  // Buscar el jugador con mayor PPG
  const mvp = [...jugadores].sort(
    (a, b) => Number(b.ppg) - Number(a.ppg)
  )[0];

  // Foto de respaldo
  const foto =
    mvp.foto &&
    (mvp.foto.startsWith("http") ||
      mvp.foto.startsWith("/"))
      ? mvp.foto
      : "/logos/LIBAVIME.png";

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-100 pt-24 p-4 md:p-10">
        <div className="max-w-5xl mx-auto mt-10">
          <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 text-center">

            {/* ENCABEZADO */}
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl py-4 px-6 mb-8">
              <h1 className="text-3xl md:text-5xl font-black text-white">
                🏆 MVP LIBAVIME 2026
              </h1>
            </div>

            {/* FOTO */}
            <Image
              src={foto}
              alt={mvp.nombre}
              width={220}
              height={220}
              className="mx-auto rounded-full border-4 border-yellow-400 object-cover"
            />

            {/* NOMBRE */}
            <h2 className="text-3xl md:text-4xl font-black mt-6">
              {mvp.nombre}
            </h2>

            {/* EQUIPO */}
            <p className="text-xl md:text-2xl mt-2 text-gray-600">
              {mvp.equipo ?? "Sin equipo"}
            </p>

            {/* ESTADÍSTICAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">

              {/* PUNTOS */}
              <div className="bg-blue-100 rounded-2xl p-6">
                <p className="text-sm font-bold text-blue-700">
                  🏀 Puntos
                </p>

                <p className="text-5xl font-black text-blue-900">
                  {mvp.ppg}
                </p>

                <p className="font-bold text-blue-700">
                  PPG
                </p>
              </div>

              {/* REBOTES */}
              <div className="bg-green-100 rounded-2xl p-6">
                <p className="text-sm font-bold text-green-700">
                  💪 Rebotes
                </p>

                <p className="text-5xl font-black text-green-700">
                  {mvp.rpg}
                </p>

                <p className="font-bold text-green-700">
                  RPG
                </p>
              </div>

              {/* ASISTENCIAS */}
              <div className="bg-red-100 rounded-2xl p-6">
                <p className="text-sm font-bold text-red-700">
                  🎯 Asistencias
                </p>

                <p className="text-5xl font-black text-red-700">
                  {mvp.apg}
                </p>

                <p className="font-bold text-red-700">
                  APG
                </p>
              </div>

            </div>

            {/* BOTÓN */}
            {mvp.slug && (
              <Link
                href={`/jugadores/${mvp.slug}`}
                className="inline-block mt-10 bg-blue-900 text-white px-8 py-4 rounded-full font-bold hover:bg-blue-800 transition"
              >
                Ver Perfil Completo
              </Link>
            )}

          </div>
        </div>
      </main>
    </>
  );
}