import Image from "next/image";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { supabase } from "@/lib/supabase";
import { equipos } from "../../data/equipos";

type Partido = {
  id: number;
  equipo_local: string | null;
  equipo_visitante: string | null;
  puntos_local: number | null;
  puntos_visitante: number | null;
  estado: string | null;
};

function normalizar(valor: string | null | undefined) {
  return String(valor ?? "").trim().toLowerCase();
}

export default async function ClasificacionPage() {
  const { data, error } = await supabase
    .from("partidos")
    .select(
      "id, equipo_local, equipo_visitante, puntos_local, puntos_visitante, estado"
    )
    .eq("estado", "Finalizado");

  const partidos = (data ?? []) as Partido[];

  if (error) {
    console.error("Error cargando clasificación:", error);
  }

  const tabla = equipos.map((equipo) => {
    let pj = 0;
    let pg = 0;
    let pp = 0;
    let pf = 0;
    let pc = 0;

    partidos.forEach((partido) => {
      if (
        partido.puntos_local === null ||
        partido.puntos_visitante === null
      ) {
        return;
      }

      const local = normalizar(partido.equipo_local);
      const visitante = normalizar(partido.equipo_visitante);
      const nombre = normalizar(equipo.nombre);

      if (local === nombre) {
        const favor = Number(partido.puntos_local);
        const contra = Number(partido.puntos_visitante);
        pj++;
        pf += favor;
        pc += contra;
        if (favor > contra) pg++;
        else pp++;
      }

      if (visitante === nombre) {
        const favor = Number(partido.puntos_visitante);
        const contra = Number(partido.puntos_local);
        pj++;
        pf += favor;
        pc += contra;
        if (favor > contra) pg++;
        else pp++;
      }
    });

    const dif = pf - pc;
    const pct = pj > 0 ? pg / pj : 0;

    return { ...equipo, pj, pg, pp, pf, pc, dif, pct };
  }).sort((a, b) =>
    b.pg - a.pg ||
    b.pct - a.pct ||
    b.dif - a.dif ||
    b.pf - a.pf ||
    a.nombre.localeCompare(b.nombre)
  );

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
              🏆 TABLA DE POSICIONES
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-gray-600">
              Clasificación oficial actualizada automáticamente con los partidos finalizados.
            </p>
          </header>

          <section className="overflow-hidden rounded-3xl bg-white shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="bg-blue-950 text-white">
                    <th className="px-4 py-4 text-center text-sm font-black">POS</th>
                    <th className="px-4 py-4 text-left text-sm font-black">EQUIPO</th>
                    <th className="px-3 py-4 text-center text-sm font-black">PJ</th>
                    <th className="px-3 py-4 text-center text-sm font-black">PG</th>
                    <th className="px-3 py-4 text-center text-sm font-black">PP</th>
                    <th className="px-3 py-4 text-center text-sm font-black">PF</th>
                    <th className="px-3 py-4 text-center text-sm font-black">PC</th>
                    <th className="px-3 py-4 text-center text-sm font-black">DIF</th>
                    <th className="px-3 py-4 text-center text-sm font-black">% G</th>
                  </tr>
                </thead>
                <tbody>
                  {tabla.map((equipo, index) => (
                    <tr
                      key={equipo.slug}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 text-center text-lg font-black text-blue-950">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                      </td>
                      <td className="px-4 py-4">
                        <Link href={`/equipos/${equipo.slug}`} className="flex items-center gap-3 font-black text-blue-950 hover:text-blue-700">
                          <Image src={equipo.logo} alt={equipo.nombre} width={52} height={52} className="h-12 w-12 object-contain" />
                          <span>{equipo.nombre}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-4 text-center font-bold">{equipo.pj}</td>
                      <td className="px-3 py-4 text-center font-black text-green-700">{equipo.pg}</td>
                      <td className="px-3 py-4 text-center font-bold text-red-700">{equipo.pp}</td>
                      <td className="px-3 py-4 text-center font-bold">{equipo.pf}</td>
                      <td className="px-3 py-4 text-center font-bold">{equipo.pc}</td>
                      <td className={`px-3 py-4 text-center font-black ${equipo.dif > 0 ? "text-green-700" : equipo.dif < 0 ? "text-red-700" : "text-gray-600"}`}>
                        {equipo.dif > 0 ? "+" : ""}{equipo.dif}
                      </td>
                      <td className="px-3 py-4 text-center font-black">{equipo.pct.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50 p-4 text-center text-xs font-bold text-gray-500 md:grid-cols-4">
              <span>PJ = Partidos jugados</span>
              <span>PG = Partidos ganados</span>
              <span>PP = Partidos perdidos</span>
              <span>DIF = Puntos a favor − puntos en contra</span>
            </div>
          </section>

          <div className="mt-6 text-center">
            <Link href="/equipos" className="inline-flex rounded-xl bg-blue-950 px-6 py-3 font-black text-white shadow hover:bg-blue-800">
              ← Ver equipos
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
