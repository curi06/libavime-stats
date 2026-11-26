import Image from "next/image";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { obtenerLiga } from "@/lib/liga-servidor";
import { LOGO_POR_DEFECTO, logoLiga, nombreCortoLiga, rutaLiga, temporadaLiga, type EquipoLiga } from "@/lib/liga";
export const dynamic = "force-dynamic";

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
  fase: "serie_regular" | "finales" | null;
};

function normalizar(valor: string | null | undefined) {
  return String(valor ?? "").trim().toLowerCase();
}

function obtenerEquipo(equipos: EquipoLiga[], nombre: string | null | undefined) {
  return equipos.find(
    (equipo) => normalizar(equipo.nombre) === normalizar(nombre)
  );
}

export default async function ResultadosPage({
  params,
}: {
  params: Promise<{ liga: string }>;
}) {
  const { liga: slugLiga } = await params;
  const datosLiga = await obtenerLiga(slugLiga);
  if (!datosLiga) notFound();
  const { liga, equipos } = datosLiga;
  const ruta = (r: string) => rutaLiga(liga.slug, r);
  const nombreLiga = nombreCortoLiga(liga);
  const temporada = temporadaLiga(liga);
  void ruta; void nombreLiga; void temporada; void equipos;
  const { data, error } = await supabase
    .from("partidos")
    .select(
      "id, equipo_local, equipo_visitante, fecha, hora, cancha, puntos_local, puntos_visitante, estado, fase"
    )
      .eq("liga_id", liga.id)
    .eq("estado", "Finalizado")
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false });

  if (error) {
    console.error("Error cargando resultados:", error);
  }

  const partidos = (data ?? []) as Partido[];

  const partidosFinales = partidos.filter((partido) => partido.fase === "finales");
  const partidosSerieRegular = partidos.filter((partido) => partido.fase === "serie_regular" || !partido.fase);

  const renderPartidos = (lista: Partido[]) => (
    lista.length === 0 ? (
      <div className="rounded-3xl bg-white p-8 text-center shadow-xl">
        <p className="font-bold text-slate-500">Todavía no hay resultados registrados en esta fase.</p>
      </div>
    ) : (
      <section className="space-y-5">
        {lista.map((partido) => {
          const equipoLocal = obtenerEquipo(equipos, partido.equipo_local);
          const equipoVisitante = obtenerEquipo(equipos, partido.equipo_visitante);
          const local = partido.puntos_local === null ? 0 : Number(partido.puntos_local);
          const visitante = partido.puntos_visitante === null ? 0 : Number(partido.puntos_visitante);
          return (
            <Link key={partido.id} href={ruta(`/resultados/${partido.id}`)} className="block rounded-3xl bg-white p-5 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl md:p-7">
              <div className="flex flex-col items-center gap-5 md:flex-row md:justify-between">
                <div className="flex w-full items-center justify-center gap-4 md:w-5/12 md:justify-end">
                  <div className="text-center md:text-right"><p className="text-lg font-black text-blue-950 md:text-xl">{partido.equipo_local}</p><p className="mt-1 text-5xl font-black text-blue-900">{local}</p></div>
                  <Image src={equipoLocal?.logo || LOGO_POR_DEFECTO} unoptimized alt={partido.equipo_local || "Equipo local"} width={90} height={90} className="h-20 w-20 object-contain md:h-24 md:w-24" />
                </div>
                <div className="flex flex-col items-center">
                  <span className={`rounded-full px-4 py-2 text-xs font-black ${partido.fase === "finales" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"}`}>{partido.fase === "finales" ? "FINAL" : "SERIE REGULAR"}</span>
                  <span className="mt-2 text-xs font-bold text-gray-500">{partido.fecha}{partido.hora ? ` · ${partido.hora}` : ""}</span>
                </div>
                <div className="flex w-full items-center justify-center gap-4 md:w-5/12 md:justify-start">
                  <Image src={equipoVisitante?.logo || LOGO_POR_DEFECTO} unoptimized alt={partido.equipo_visitante || "Equipo visitante"} width={90} height={90} className="h-20 w-20 object-contain md:h-24 md:w-24" />
                  <div className="text-center md:text-left"><p className="text-lg font-black text-blue-950 md:text-xl">{partido.equipo_visitante}</p><p className="mt-1 text-5xl font-black text-red-900">{visitante}</p></div>
                </div>
              </div>
              <div className="mt-5 border-t border-slate-100 pt-4 text-center text-sm font-bold text-gray-500">{partido.cancha ? `📍 ${partido.cancha}` : `🏀 ${nombreLiga} ${temporada}`} · Ver boxscore →</div>
            </Link>
          );
        })}
      </section>
    )
  );

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-100 px-4 pb-16 pt-28 md:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8 text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-700">
              {nombreLiga} {temporada}
            </p>
            <h1 className="mt-2 text-4xl font-black text-blue-950 md:text-5xl">
              🏆 RESULTADOS
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-gray-600">
              Resultados oficiales de los partidos finalizados.
            </p>
          </header>

          <section className="mb-12">
            <div className="mb-5 text-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-600">Gladiadores vs. Espartanos</p>
              <h2 className="mt-1 text-2xl font-black text-blue-950 md:text-3xl">🏆 RESULTADOS DE LAS FINALES</h2>
              <p className="mt-2 text-sm text-slate-500">Marcadores de la serie final, separados de la temporada regular.</p>
            </div>
            {renderPartidos(partidosFinales)}
          </section>
          <section>
            <div className="mb-5 text-center">
              <h2 className="text-2xl font-black text-blue-950 md:text-3xl">📋 RESULTADOS DE LA SERIE REGULAR</h2>
              <p className="mt-2 text-sm text-slate-500">Historial de los partidos de la fase regular.</p>
            </div>
            {renderPartidos(partidosSerieRegular)}
          </section>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href={ruta("/clasificacion")}
              className="rounded-xl bg-blue-950 px-6 py-3 font-black text-white shadow hover:bg-blue-800"
            >
              🏆 Ver clasificación
            </Link>

            <Link
              href={ruta("/")}
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
