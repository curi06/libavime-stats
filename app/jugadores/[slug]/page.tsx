import { supabase } from "@/lib/supabase";
import Image from "next/image";

export default async function JugadorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  console.log("SLUG URL:", slug);

const { data, error, count } = await supabase
  .from("jugadores")
  .select("*", { count: "exact" });


const jugador = data?.find(
  (j) => j.slug === slug
);
console.log("SLUG:", slug);
console.log("JUGADOR:", jugador);
console.log("ERROR:", error);

  console.log("JUGADOR:", jugador);

  if (!jugador) {
    return (
      <main className="p-10">
        <h1>Jugador no encontrado</h1>
      </main>
    );
  }  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-10">
      <div className="max-w-3xl mx-auto">

        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">

          <Image
  src={
    jugador.foto?.startsWith("/")
      ? jugador.foto
      : "/logos/LIBAVIME.png"
  }
  alt={jugador.nombre}
  width={250}
  height={250}
  className="mx-auto rounded-full border-4 border-blue-900"
/>
          <h1 className="text-4xl font-black mt-6">
            {jugador.nombre}
          </h1>

          <p className="text-gray-600 text-lg">
            #{jugador.numero} • {jugador.posicion}
          </p>

          <div className="mt-4">
           <Image
  src="/logos/LIBAVIME.png"
  alt="LIBAVIME"
  width={80}
  height={80}
  className="mx-auto"
/>
          </div>

          <p className="font-bold text-xl mt-2">
            {jugador.equipo}
          </p>

          <div className="grid grid-cols-3 gap-4 mt-8">

            <div className="bg-blue-100 rounded-xl p-4">
              <p className="text-sm">PPG</p>
              <p className="text-3xl font-bold">
                {jugador.ppg}
              </p>
            </div>

            <div className="bg-green-100 rounded-xl p-4">
              <p className="text-sm">RPG</p>
              <p className="text-3xl font-bold">
                {jugador.rpg}
              </p>
            </div>

            <div className="bg-yellow-100 rounded-xl p-4">
              <p className="text-sm">APG</p>
              <p className="text-3xl font-bold">
                {jugador.apg}
              </p>
            </div>

          </div>

        </div>

      </div>
    </main>
  );
}
