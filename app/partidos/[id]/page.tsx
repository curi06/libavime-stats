import Image from "next/image";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { supabase } from "@/lib/supabase";
import { equipos } from "../../../data/equipos";

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

type Jugador = {
  id: number;
  nombre: string;
  slug: string;
  numero: number | null;
  posicion: string | null;
  equipo: string | null;
  foto: string | null;
};

type Estadistica = {
  jugador_id: number;
  partido_id: number;
  puntos: number | null;
  rebotes: number | null;
  asistencias: number | null;
};

function normalizar(valor: string | null | undefined) {
  return String(valor ?? "").trim().toLowerCase();
}

function obtenerEquipo(nombre: string | null | undefined) {
  return equipos.find((equipo) => normalizar(equipo.nombre) === normalizar(nombre));
}

function obtenerFoto(foto: string | null) {
  if (foto && (foto.startsWith("/") || foto.startsWith("http://") || foto.startsWith("https://"))) return foto;
  return "/logos/LIBAVIME.png";
}

export default async function PartidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partidoId = Number(id);

  const [{ data: partidoData, error: partidoError }, { data: jugadoresData, error: jugadoresError }, { data: estadisticasData, error: estadisticasError }] = await Promise.all([
    supabase
      .from("partidos")
      .select("id, equipo_local, equipo_visitante, fecha, hora, cancha, puntos_local, puntos_visitante, estado")
      .eq("id", partidoId)
      .maybeSingle(),
    supabase
      .from("jugadores")
      .select("id, nombre, slug, numero, posicion, equipo, foto"),
    supabase
      .from("estadisticas_partido")
      .select("jugador_id, partido_id, puntos, rebotes, asistencias")
      .eq("partido_id", partidoId),
  ]);

  if (partidoError) console.error("Error cargando partido:", partidoError);
  if (jugadoresError) console.error("Error cargando jugadores:", jugadoresError);
  if (estadisticasError) console.error("Error cargando boxscore:", estadisticasError);

  const partido = partidoData as Partido | null;

  if (!partido) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-slate-100 px-4 pt-32">
          <div className="mx-auto max-w-xl rounded-3xl bg-white p-10 text-center shadow-xl">
            <h1 className="text-3xl font-black text-blue-950">Partido no encontrado</h1>
            <p className="mt-3 text-gray-600">No pudimos encontrar el partido solicitado.</p>
            <Link href="/resultados" className="mt-7 inline-block rounded-xl bg-blue-950 px-6 py-3 font-black text-white">← Volver a resultados</Link>
          </div>
        </main>
      </>
    );
  }

  const localEquipo = obtenerEquipo(partido.equipo_local);
  const visitanteEquipo = obtenerEquipo(partido.equipo_visitante);
  const jugadores = (jugadoresData ?? []) as Jugador[];
  const estadisticas = (estadisticasData ?? []) as Estadistica[];

  const statsMap = new Map<number, Estadistica>();
  estadisticas.forEach((stat) => statsMap.set(Number(stat.jugador_id), stat));

  const construirRoster = (nombreEquipo: string | null) =>
    jugadores
      .filter((jugador) => normalizar(jugador.equipo) === normalizar(nombreEquipo))
      .map((jugador) => {
        const stat = statsMap.get(Number(jugador.id));
        return {
          ...jugador,
          puntos: Number(stat?.puntos) || 0,
          rebotes: Number(stat?.rebotes) || 0,
          asistencias: Number(stat?.asistencias) || 0,
        };
      })
      .sort((a, b) => b.puntos - a.puntos || b.rebotes - a.rebotes || b.asistencias - a.asistencias || a.nombre.localeCompare(b.nombre));

  const localJugadores = construirRoster(partido.equipo_local);
  const visitanteJugadores = construirRoster(partido.equipo_visitante);

  const total = (lista: typeof localJugadores) => ({
    puntos: lista.reduce((s, j) => s + j.puntos, 0),
    rebotes: lista.reduce((s, j) => s + j.rebotes, 0),
    asistencias: lista.reduce((s, j) => s + j.asistencias, 0),
  });

  const localTotal = total(localJugadores);
  const visitanteTotal = total(visitanteJugadores);

  const filas = (lista: typeof localJugadores) => lista.map((jugador, index) => (
    <tr key={jugador.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
      <td className="px-3 py-3 text-center font-black text-blue-950">{index + 1}</td>
      <td className="px-3 py-3">
        <Link href={`/jugadores/${jugador.slug}`} className="flex items-center gap-3 font-black text-slate-800 hover:text-blue-700">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-blue-600 bg-white">
            <Image src={obtenerFoto(jugador.foto)} alt={jugador.nombre} fill sizes="44px" className="object-cover" style={{ transform: "scale(1.35)", objectPosition: "50% 42%" }} />
          </div>
          <span>{jugador.nombre}</span>
        </Link>
      </td>
      <td className="px-3 py-3 text-center font-black text-red-700">{jugador.puntos}</td>
      <td className="px-3 py-3 text-center font-bold">{jugador.rebotes}</td>
      <td className="px-3 py-3 text-center font-bold">{jugador.asistencias}</td>
    </tr>
  ));

  const tarjeta = (nombre: string | null, equipo: typeof localEquipo, score: number | null, resumen: ReturnType<typeof total>, lista: typeof localJugadores) => (
    <section className="overflow-hidden rounded-3xl bg-white shadow-xl">
      <div className="flex items-center gap-4 bg-blue-950 p-5 text-white">
        {equipo?.logo ? <Image src={equipo.logo} alt={nombre ?? "Equipo"} width={72} height={72} className="h-[72px] w-[72px] object-contain" /> : null}
        <div>
          <h2 className="text-2xl font-black md:text-3xl">{nombre}</h2>
          <p className="text-sm font-bold text-blue-200">BOX SCORE DEL PARTIDO</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 border-b bg-slate-50 p-4 text-center">
        <div><p className="text-xs font-black text-gray-500">PTS</p><p className="text-2xl font-black text-red-700">{resumen.puntos}</p></div>
        <div><p className="text-xs font-black text-gray-500">REB</p><p className="text-2xl font-black text-purple-700">{resumen.rebotes}</p></div>
        <div><p className="text-xs font-black text-gray-500">AST</p><p className="text-2xl font-black text-yellow-600">{resumen.asistencias}</p></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead><tr className="bg-slate-100 text-xs font-black text-gray-500"><th className="px-3 py-3 text-center">POS</th><th className="px-3 py-3 text-left">JUGADOR</th><th className="px-3 py-3 text-center">PTS</th><th className="px-3 py-3 text-center">REB</th><th className="px-3 py-3 text-center">AST</th></tr></thead>
          <tbody>{filas(lista)}</tbody>
          <tfoot><tr className="bg-blue-950 text-white"><td colSpan={2} className="px-3 py-4 text-right font-black">TOTAL</td><td className="px-3 py-4 text-center text-lg font-black">{score ?? resumen.puntos}</td><td className="px-3 py-4 text-center font-black">{resumen.rebotes}</td><td className="px-3 py-4 text-center font-black">{resumen.asistencias}</td></tr></tfoot>
        </table>
      </div>
    </section>
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-100 px-4 pb-16 pt-28 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950 p-6 text-white shadow-2xl md:p-10">
            <p className="text-center text-xs font-black uppercase tracking-[0.25em] text-blue-200">LIBAVIME · BOX SCORE OFICIAL</p>
            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-8">
              <div className="text-center">
                {localEquipo?.logo ? <Image src={localEquipo.logo} alt={partido.equipo_local ?? "Local"} width={110} height={110} className="mx-auto h-20 w-20 object-contain md:h-28 md:w-28" /> : null}
                <h1 className="mt-2 text-xl font-black md:text-3xl">{partido.equipo_local}</h1>
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-blue-200">FINAL</p>
                <p className="mt-1 text-5xl font-black md:text-7xl">{partido.puntos_local ?? 0} <span className="text-2xl text-blue-300 md:text-4xl">-</span> {partido.puntos_visitante ?? 0}</p>
              </div>
              <div className="text-center">
                {visitanteEquipo?.logo ? <Image src={visitanteEquipo.logo} alt={partido.equipo_visitante ?? "Visitante"} width={110} height={110} className="mx-auto h-20 w-20 object-contain md:h-28 md:w-28" /> : null}
                <h1 className="mt-2 text-xl font-black md:text-3xl">{partido.equipo_visitante}</h1>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm font-bold text-blue-100">
              {partido.fecha ? <span className="rounded-full bg-white/10 px-4 py-2">📅 {partido.fecha}</span> : null}
              {partido.hora ? <span className="rounded-full bg-white/10 px-4 py-2">🕐 {partido.hora}</span> : null}
              {partido.cancha ? <span className="rounded-full bg-white/10 px-4 py-2">📍 {partido.cancha}</span> : null}
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 text-center shadow-lg"><p className="text-xs font-black uppercase text-gray-500">Comparativa · {partido.equipo_local}</p><div className="mt-3 grid grid-cols-3 gap-2"><div><p className="text-xs text-gray-500">PTS</p><p className="text-2xl font-black text-red-700">{localTotal.puntos}</p></div><div><p className="text-xs text-gray-500">REB</p><p className="text-2xl font-black text-purple-700">{localTotal.rebotes}</p></div><div><p className="text-xs text-gray-500">AST</p><p className="text-2xl font-black text-yellow-600">{localTotal.asistencias}</p></div></div></div>
            <div className="rounded-2xl bg-white p-5 text-center shadow-lg"><p className="text-xs font-black uppercase text-gray-500">Comparativa · {partido.equipo_visitante}</p><div className="mt-3 grid grid-cols-3 gap-2"><div><p className="text-xs text-gray-500">PTS</p><p className="text-2xl font-black text-red-700">{visitanteTotal.puntos}</p></div><div><p className="text-xs text-gray-500">REB</p><p className="text-2xl font-black text-purple-700">{visitanteTotal.rebotes}</p></div><div><p className="text-xs text-gray-500">AST</p><p className="text-2xl font-black text-yellow-600">{visitanteTotal.asistencias}</p></div></div></div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {tarjeta(partido.equipo_local, localEquipo, partido.puntos_local, localTotal, localJugadores)}
            {tarjeta(partido.equipo_visitante, visitanteEquipo, partido.puntos_visitante, visitanteTotal, visitanteJugadores)}
          </div>

          <div className="mt-8 text-center">
            <Link href="/resultados" className="inline-flex rounded-xl bg-blue-950 px-6 py-3 font-black text-white shadow hover:bg-blue-800">← Volver a resultados</Link>
          </div>
        </div>
      </main>
    </>
  );
}
