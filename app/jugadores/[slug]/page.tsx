import { supabase } from "@/lib/supabase";
import Navbar from "../../components/Navbar";
import Image from "next/image";
import Link from "next/link";

export default async function JugadorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: jugador, error } = await supabase
  .from("jugadores")
  .select("*")
  .eq("slug", slug)
  .single();

const { data: estadisticas, error: estadisticasError } = jugador
  ? await supabase
      .from("estadisticas_jugadores")
      .select("*")
      .eq("jugador_id", jugador.id)
      .single()
  : { data: null, error: null };
if (error || !jugador) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-slate-100 pt-28 p-6">
          <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-8 text-center">
            <h1 className="text-3xl font-black text-blue-900">
              Jugador no encontrado
            </h1>

            <p className="text-gray-600 mt-3">
              No pudimos encontrar este jugador.
            </p>

            <Link
              href="/jugadores"
              className="inline-block mt-6 bg-blue-900 text-white px-6 py-3 rounded-xl font-bold"
            >
              ← Volver a jugadores
            </Link>
          </div>
        </main>
      </>
    );
  }

  const foto =
    jugador.foto &&
    (jugador.foto.startsWith("http") ||
      jugador.foto.startsWith("/"))
      ? jugador.foto
      : "/logos/LIBAVIME.png";

  const equipoNormalizado = jugador.equipo?.trim().toLowerCase();

let colorEquipo = "#1E3A8A";

let colorFondoClaro = "#DBEAFE";
let colorTexto = "#1E3A8A";

if (equipoNormalizado === "vikingos") {
  colorFondoClaro = "#F3E8FF";
  colorTexto = "#6B21A8";
} else if (equipoNormalizado === "gladiadores") {
  colorFondoClaro = "#DCFCE7";
  colorTexto = "#15803D";
} else if (equipoNormalizado === "espartanos") {
  colorFondoClaro = "#FEF9C3";
  colorTexto = "#A16207";
} else if (equipoNormalizado === "titanes") {
  colorFondoClaro = "#FEE2E2";
  colorTexto = "#DC2626";
}

if (equipoNormalizado === "vikingos") {
  colorEquipo = "#6B21A8"; // Morado
} else if (equipoNormalizado === "gladiadores") {
  colorEquipo = "#15803D"; // Verde
} else if (equipoNormalizado === "espartanos") {
  colorEquipo = "#FACC15"; // Amarillo
} else if (equipoNormalizado === "titanes") {
  colorEquipo = "#DC2626"; // Rojo
}
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-100 pt-24 p-4 md:p-10">
        <div className="max-w-4xl mx-auto">

          <Link
            href="/jugadores"
            className="inline-block mb-6 text-blue-900 font-bold hover:underline"
          >
            ← Volver a jugadores
          </Link>

          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">

            <div
            style={{ backgroundColor: colorEquipo }}
            className="p-8 md:p-12 text-center text-white"
>

              <div className="w-52 h-52 mx-auto overflow-hidden rounded-full border-4 border-white bg-white">
                <Image
                  src={foto}
                  alt={jugador.nombre}
                  width={250}
                  height={250}
                  className="w-full h-full object-cover scale-125"
                />
              </div>

              <h1 className="text-4xl md:text-5xl font-black mt-6">
                {jugador.nombre}
              </h1>

              <p className="text-xl mt-2">
                #{jugador.numero ?? "-"} •{" "}
                {jugador.posicion || "Jugador"}
              </p>

              <p className="font-bold text-lg mt-3">
                {jugador.equipo}
              </p>
               <p className="text-lg mt-2">
               {estadisticas?.partidos_jugados ?? 0} partidos jugados
               </p>

            </div>

            <div className="p-6 md:p-10">

              <h2 className="text-2xl font-black text-center mb-6">
                ESTADÍSTICAS DE TEMPORADA
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

                <div
  style={{ backgroundColor: colorFondoClaro }}
  className="rounded-2xl p-6 text-center"
>
  <p
    style={{ color: colorTexto }}
    className="text-sm font-bold"
  >
    PUNTOS POR PARTIDO
  </p>

  <p
    style={{ color: colorEquipo }}
    className="text-5xl font-black mt-2"
  >
    {estadisticas?.ppg ?? 0}
  </p>

  <p
    style={{ color: colorTexto }}
    className="font-bold mt-2"
  >
    PPG
  </p>
</div>

                <div
  style={{ backgroundColor: colorFondoClaro }}
  className="rounded-2xl p-6 text-center"
>
  <p
    style={{ color: colorTexto }}
    className="text-sm font-bold"
  >
    REBOTES POR PARTIDO
  </p>

  <p
    style={{ color: colorEquipo }}
    className="text-5xl font-black mt-2"
  >
    {estadisticas?.rpg ?? 0}
  </p>

  <p
    style={{ color: colorTexto }}
    className="font-bold mt-2"
  >
    RPG
  </p>
</div>

                <div
  style={{ backgroundColor: colorFondoClaro }}
  className="rounded-2xl p-6 text-center"
>
  <p
    style={{ color: colorTexto }}
    className="text-sm font-bold"
  >
    ASISTENCIAS POR PARTIDO
  </p>

  <p
    style={{ color: colorEquipo }}
    className="text-5xl font-black mt-2"
  >
    {estadisticas?.apg ?? 0}
  </p>

  <p
    style={{ color: colorTexto }}
    className="font-bold mt-2"
  >
    APG
  </p>
</div>

              </div>

              <div className="mt-10 border-t pt-8">
                <h2 className="text-2xl font-black text-center">
                  PRÓXIMAMENTE
                </h2>

                <p className="text-center text-gray-600 mt-2">
                  Aquí mostraremos el historial partido por partido.
                </p>
              </div>

            </div>
          </div>
        </div>
      </main>
    </>
  );
}