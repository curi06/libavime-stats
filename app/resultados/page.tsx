import Image from "next/image";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { supabase } from "@/lib/supabase";
import { equipos } from "../../data/equipos";

type Partido = {
  id: number;
  equipo_local: string | null;
  equipo_visitante: string | null;
  fecha: string | null;
  hora: string | null;
  cancha: string | null;
  puntos_local: number | null;
  puntos_visitante: number | null;
  estado: string | null;
};

function normalizar(valor: string | null | undefined) {
  return String(valor ?? "").trim().toLowerCase();
}

function obtenerEquipo(nombre: string | null | undefined) {
  return equipos.find(
    (equipo) => normalizar(equipo.nombre) === normalizar(nombre)
  );
}

export default async function ResultadosPage() {
  const { data, error } = await supabase
    .from("partidos")
    .select(
      "id, equipo_local, equipo_visitante, fecha, hora, cancha, puntos_local, puntos_visitante, estado"
    )
    .eq("estado", "Finalizado")
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false });

  if (error) {
    console.error("Error cargando resultados:", error);
  }

  const partidos = (data ?? []) as Partido[];

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-100 px-4 pb-16 pt-28 md:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8 text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-700">
              LIBAVIME 2026
            </p>
            <h1 className="mt-2 text-4xl font-black text-blue-950 md:text-5xl">
              🏆 RESULTADOS
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-gray-600">
              Resultados oficiales de los partidos finalizados.
            </p>
          </header>

          {partidos.length === 0 ? (
            <section className="rounded-3xl bg-white p-10 text-center shadow-xl">
              <p className="text-xl font-black text-blue-950">
                Todavía no hay partidos finalizados.
              </p>
            </section>
          ) : (
            <section className="space-y-5">
              {partidos.map((partido) => {
                const equipoLocal = obtenerEquipo(partido.equipo_local);
                const equipoVisitante = obtenerEquipo(partido.equipo_visitante);

                const local =
                  partido.puntos_local === null
                    ? 0
                    : Number(partido.puntos_local);

                const visitante =
                  partido.puntos_visitante === null
                    ? 0
                    : Number(partido.puntos_visitante);

                return (
                  <Link
                    key={partido.id}
                    href={`/resultados/${partido.id}`}
                    className="block rounded-3xl bg-white p-5 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl md:p-7"
                  >
                    <div className="flex flex-col items-center gap-5 md:flex-row md:justify-between">
                      <div className="flex w-full items-center justify-center gap-4 md:w-5/12 md:justify-end">
                        <div className="text-center md:text-right">
                          <p className="text-lg font-black text-blue-950 md:text-xl">
                            {partido.equipo_local}
                          </p>
                          <p className="mt-1 text-5xl font-black text-blue-900">
                            {local}
                          </p>
                        </div>

                        <Image
                          src={equipoLocal?.logo || "/logos/LIBAVIME.png"}
                          unoptimized
                          alt={partido.equipo_local || "Equipo local"}
                          width={90}
                          height={90}
                          className="h-20 w-20 object-contain md:h-24 md:w-24"
                        />
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="rounded-full bg-green-100 px-4 py-2 text-xs font-black text-green-700">
                          FINAL
                        </span>

                        <span className="mt-2 text-xs font-bold text-gray-500">
                          {partido.fecha}
                          {partido.hora ? ` · ${partido.hora}` : ""}
                        </span>
                      </div>

                      <div className="flex w-full items-center justify-center gap-4 md:w-5/12 md:justify-start">
                        <Image
                          src={
                            equipoVisitante?.logo ||
                            "/logos/LIBAVIME.png"
                          }
                          unoptimized
                          alt={
                            partido.equipo_visitante ||
                            "Equipo visitante"
                          }
                          width={90}
                          height={90}
                          className="h-20 w-20 object-contain md:h-24 md:w-24"
                        />

                        <div className="text-center md:text-left">
                          <p className="text-lg font-black text-blue-950 md:text-xl">
                            {partido.equipo_visitante}
                          </p>
                          <p className="mt-1 text-5xl font-black text-red-900">
                            {visitante}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4 text-center text-sm font-bold text-gray-500">
                      {partido.cancha
                        ? `📍 ${partido.cancha}`
                        : "🏀 LIBAVIME 2026"}{" "}
                      · Ver boxscore →
                    </div>
                  </Link>
                );
              })}
            </section>
          )}

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/clasificacion"
              className="rounded-xl bg-blue-950 px-6 py-3 font-black text-white shadow hover:bg-blue-800"
            >
              🏆 Ver clasificación
            </Link>

            <Link
              href="/"
              className="rounded-xl bg-white px-6 py-3 font-black text-blue-950 shadow hover:bg-slate-50"
            >
              ← Inicio
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
