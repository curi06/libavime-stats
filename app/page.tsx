"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { equipos } from "../data/equipos";

type Partido = {
  id: number;
  local: string;
  visitante: string;
  fecha: string;
  hora?: string | null;
  cancha?: string | null;
  puntosLocal: number | null;
  puntosVisitante: number | null;
  estado: string | null;
};

export default function Home() {
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [partidosActuales, setPartidosActuales] = useState<Partido[]>([]);
  const [menuAbierto, setMenuAbierto] = useState(false);

useEffect(() => {
  const cargarDatos = async () => {
    const [
      { data: jugadoresData, error: jugadoresError },
      { data: estadisticasData, error: estadisticasError },
      { data: partidosData, error: partidosError },
    ] = await Promise.all([
      supabase.from("jugadores").select("*"),
      supabase.from("estadisticas_jugadores").select("*"),
      supabase
        .from("partidos")
        .select(`
          id,
          equipo_local,
          equipo_visitante,
          fecha,
          hora,
          cancha,
          puntos_local,
          puntos_visitante,
          estado
        `)
        .order("fecha", { ascending: true })
        .order("hora", { ascending: true }),
    ]);

    if (jugadoresError || estadisticasError || partidosError) {
      console.error("Error jugadores:", jugadoresError);
      console.error("Error estadísticas:", estadisticasError);
      console.error("Error partidos:", partidosError);
      return;
    }

    const jugadoresConEstadisticas = (jugadoresData ?? []).map(
      (jugador: any) => {
        const estadisticas = (estadisticasData ?? []).find(
          (estadistica: any) =>
            String(estadistica.jugador_id) === String(jugador.id)
        );

        return {
          ...jugador,
          ppg: Number(estadisticas?.ppg) || 0,
          rpg: Number(estadisticas?.rpg) || 0,
          apg: Number(estadisticas?.apg) || 0,
          partidos_jugados:
            Number(estadisticas?.partidos_jugados) || 0,
        };
      }
    );

    const partidosConFormato: Partido[] = (partidosData ?? []).map(
      (partido: any) => ({
        id: partido.id,
        local: partido.equipo_local,
        visitante: partido.equipo_visitante,
        fecha: partido.fecha,
        hora: partido.hora,
        cancha: partido.cancha,
        puntosLocal:
          partido.puntos_local === null ||
          partido.puntos_local === undefined
            ? null
            : Number(partido.puntos_local),
        puntosVisitante:
          partido.puntos_visitante === null ||
          partido.puntos_visitante === undefined
            ? null
            : Number(partido.puntos_visitante),
        estado: partido.estado,
      })
    );

    setJugadores(jugadoresConEstadisticas);
    setPartidosActuales(partidosConFormato);
  };

  cargarDatos();
}, []);

  // Estadísticas de los 44 jugadores ordenadas por puntos.
  // En caso de empate: rebotes, asistencias y luego nombre.
  const jugadoresOrdenados = [...jugadores].sort((a, b) => {
    const puntos = Number(b.ppg) - Number(a.ppg);
    if (puntos !== 0) return puntos;

    const rebotes = Number(b.rpg) - Number(a.rpg);
    if (rebotes !== 0) return rebotes;

    const asistencias = Number(b.apg) - Number(a.apg);
    if (asistencias !== 0) return asistencias;

    return String(a.nombre).localeCompare(String(b.nombre));
  });

  if (jugadores.length === 0) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-xl font-bold text-blue-900">
          Cargando estadísticas...
        </p>
      </main>
    );
  }
  const posiciones = equipos.map((equipo) => {
  let ganados = 0;
  let perdidos = 0;

  

  partidosActuales.forEach((partido) => {
    if (
      partido.estado !== "Finalizado" ||
      partido.puntosLocal === null ||
      partido.puntosVisitante === null
    ) {
      return;
    }

    if (partido.local === equipo.nombre) {
      if (partido.puntosLocal > partido.puntosVisitante) {
        ganados++;
      } else {
        perdidos++;
      }
    }

    if (partido.visitante === equipo.nombre) {
      if (partido.puntosVisitante > partido.puntosLocal) {
        ganados++;
      } else {
        perdidos++;
      }
    }
  });

  const jj = ganados + perdidos;

  return {
    ...equipo,
    ganados,
    perdidos,
    jj,
    pct:
      jj === 0
        ? ".000"
        : (ganados / jj).toFixed(3),
  };
});  
    
const totalPuntos = jugadores.reduce(
  (total, jugador) => total + jugador.ppg,
  0
);
const posicionesOrdenadas = [...posiciones].sort(
  (a, b) => parseFloat(b.pct) - parseFloat(a.pct)
);
const ultimosResultados = [...partidosActuales]
  .filter(
    (partido) =>
      partido.estado === "Finalizado" &&
      partido.puntosLocal !== null &&
      partido.puntosVisitante !== null
  )
  .slice(-3)
  .reverse();

  return (
    <><div className="relative h-[55vh] md:h-[105vh] w-full">
<nav className="absolute top-0 left-0 right-0 z-20 px-4 pt-2">

  <div className="max-w-6xl mx-auto">

    <div className="bg-blue-950/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10">

      {/* PC */}
<div className="hidden md:flex items-center justify-center gap-8 text-white font-semibold py-4">

  <Image
    src="/logos/LIBAVIME.png"
    alt="LIBAVIME"
    width={42}
    height={42}
    className="object-contain"
  />

  <a href="/">🏠 Inicio</a>
  <a href="/equipos">🏀 Equipos</a>
  <a href="/jugadores">👤 Jugadores</a>
  <a href="/calendario">📅 Calendario</a>
  <a href="/resultados">🏆 Resultados</a>
  <a href="/estadisticas">📊 Estadísticas</a>
  <a href="/mvp">🏆 MVP</a>

</div>

      {/* Móvil */}
<div className="md:hidden">

  <button
    onClick={() => setMenuAbierto(!menuAbierto)}
    className="w-full flex justify-between items-center px-4 py-3 text-white"
  >
    <div className="flex-1 flex justify-center items-center gap-3">

      <Image
        src="/logos/LIBAVIME.png"
        alt="LIBAVIME"
        width={40}
        height={40}
        className="object-contain"
      />

      <span className="font-black text-lg">
        LIBAVIME
      </span>

    </div>

    <span className="text-2xl">
      ☰
    </span>

  </button>
        {menuAbierto && (
          <div className="flex flex-col text-center text-white pb-4 gap-3">

            <a href="/">🏠 Inicio</a>
            <a href="/equipos">🏀 Equipos</a>
            <a href="/jugadores">👤 Jugadores</a>
            <a href="/calendario">📅 Calendario</a>
            <a href="/resultados">🏆 Resultados</a>
            <a href="/estadisticas">📊 Estadísticas</a>
            <a href="/mvp">🏆 MVP</a>

          </div>
        )}

      </div>

    </div>

  </div>

</nav>
    <Image
  src="/banners/libavime-banner-2026.png"
  alt="LIBAVIME"
  fill
  priority
  className="object-cover object-[center_35%] md:object-center"
/>
    <div className="absolute inset-0 bg-black/20"></div>


</div>


<main
  id="contenido"
  className="min-h-screen bg-slate-100 p-4 md:p-10"
>
  
  <div className="max-w-5xl mx-auto">

<div className="grid grid-cols-2 md:grid-cols-2 md:grid-cols-4 gap-4 mt-8">
  <div className="bg-white p-4 rounded-xl shadow text-center">
  <h3 className="text-3xl font-bold text-blue-900">
    {equipos.length}
  </h3>
  <p>Equipos</p>
</div>

  <div className="bg-white p-4 rounded-xl shadow text-center">
  <h3 className="text-3xl font-bold text-green-600">
    {partidosActuales.length}
  </h3>
  <p>Partidos</p>
</div>

  <div className="bg-white p-4 rounded-xl shadow text-center">
    <h3 className="text-3xl font-bold text-red-600">
  {totalPuntos}
</h3>
    <p>Puntos</p>
    
  </div>

  <div className="bg-white p-4 rounded-xl shadow text-center">
    <h3 className="text-3xl font-bold text-yellow-500">2026</h3>
    <p>Temporada</p>
  </div>
</div>

<div className="mt-8 bg-gradient-to-r from-blue-900 to-blue-700 text-white rounded-3xl p-6 shadow-xl text-center">

  <h2 className="text-2xl md:text-3xl font-black">
    👑 Campeón Defensor
  </h2>

  <p className="text-2xl mt-4 font-bold">
    Vikingos
  </p>

  <p className="mt-2">
    Campeón LIBAVIME 2025
  </p>

</div>

        {/* TARJETAS DE LOS 4 EQUIPOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          {posicionesOrdenadas.slice(0, 4).map((equipo, index) => {
            const estilosPorEquipo: Record<string, {
              fondo: string;
              titulo: string;
              record: string;
            }> = {
              Vikingos: {
                fondo: "bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500",
                titulo: "text-slate-900",
                record: "text-slate-800",
              },
              Gladiadores: {
                fondo: "bg-gradient-to-br from-slate-300 via-slate-400 to-slate-600",
                titulo: "text-white",
                record: "text-white",
              },
              Titanes: {
                fondo: "bg-gradient-to-br from-orange-300 via-orange-400 to-orange-600",
                titulo: "text-slate-900",
                record: "text-slate-800",
              },
              Espartanos: {
                fondo: "bg-gradient-to-br from-red-600 via-red-700 to-red-900",
                titulo: "text-white",
                record: "text-white",
              },
            };

            const estilo = estilosPorEquipo[equipo.nombre] ?? {
              fondo: "bg-gradient-to-br from-blue-700 to-blue-950",
              titulo: "text-white",
              record: "text-white",
            };

            const puesto = index + 1;

            return (
              <Link
                key={equipo.nombre}
                href={`/equipos/${equipo.slug}`}
                className={`${estilo.fondo} min-h-[360px] w-full rounded-3xl shadow-xl text-center flex flex-col items-center justify-center p-6 hover:scale-[1.02] transition-transform duration-200`}
              >
                <div className="flex flex-col items-center justify-center mb-4">
                  <span className="text-4xl leading-none -mb-1">🏅</span>
                  <span className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/30 shadow-lg flex items-center justify-center text-3xl font-black text-white backdrop-blur-sm">
                    {puesto}
                  </span>
                </div>

                <div className="h-40 w-full flex items-center justify-center">
                  <Image
                    src={equipo.logo}
                    alt={equipo.nombre}
                    width={160}
                    height={160}
                    className="max-w-[160px] max-h-[160px] w-auto h-auto object-contain"
                  />
                </div>

                <h3 className={`text-3xl font-black mt-6 leading-tight ${estilo.titulo}`}>
                  {equipo.nombre}
                </h3>

                <p className={`font-bold text-xl mt-4 ${estilo.record}`}>
                  Récord {equipo.ganados}-{equipo.perdidos}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-10">

<div className="bg-white mt-10 p-6 rounded-xl shadow">
  <h2 className="text-2xl font-bold mb-4">
    🏆 Tabla de Posiciones
  </h2>

  <div className="overflow-x-auto">
  <table className="w-full border-collapse">
    <thead>
  <tr className="border-b bg-blue-900 text-white">
  <th className="p-2">#</th>
  <th className="text-left p-2">Equipo</th>
    <th className="p-2">JJ</th>
    <th className="p-2">G</th>
    <th className="p-2">P</th>
    <th className="p-2">PCT</th>
  </tr>
</thead>
    <tbody>
      {posicionesOrdenadas.map((equipo, index) => (
  <tr key={equipo.nombre} className="border-b">
    <td className="p-2 text-center font-bold">
      {index + 1}
    </td>

    <td className="p-2">
  <Link
    href={`/equipos/${equipo.slug}`}
    className="flex items-center gap-3 font-semibold hover:text-blue-600"
  >
    <Image
      src={equipo.logo}
      alt={equipo.nombre}
      width={35}
      height={35}
    />

    {equipo.nombre}
  </Link>
</td>
    <td className="p-2 text-center">{equipo.jj}</td>
    <td className="p-2 text-center">{equipo.ganados}</td>
    <td className="p-2 text-center">{equipo.perdidos}</td>
    <td className="p-2 text-center">{equipo.pct}</td>
  </tr>
))}

    </tbody>
</table>
</div>
</div>

<div className="bg-white p-6 rounded-xl shadow">
  <h2 className="text-2xl font-bold mb-4">
    🔥 Últimos Resultados
  </h2>

  <div className="space-y-4">

    {ultimosResultados.map((partido, index) => (
      <div
        key={index}
        className="bg-slate-50 border-l-8 border-green-500 rounded-2xl p-5 shadow hover:shadow-lg transition"
      >
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">

          <div className="flex items-center gap-3">

  <Image
    src={
      equipos.find(
        (e) => e.nombre === partido.local
      )?.logo || "/logo.png"
    }
    alt={partido.local}
    width={40}
    height={40}
  />

  <div>
    <p className="font-bold">
      {partido.local}
    </p>

    <p className="text-4xl font-black text-blue-900">
      {partido.puntosLocal}
    </p>
  </div>

</div>

          <div className="text-center">
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-black">
             FINAL
            </div>
          </div>

          <div className="flex items-center gap-3">

  <div className="text-right">
    <p className="font-bold">
      {partido.visitante}
    </p>

    <p className="text-4xl font-black text-red-900">
      {partido.puntosVisitante}
    </p>
  </div>

  <Image
    src={
      equipos.find(
        (e) => e.nombre === partido.visitante
      )?.logo || "/logo.png"
    }
    alt={partido.visitante}
    width={40}
    height={40}
  />

</div>
          </div>

<p className="text-sm text-gray-500 mt-3 text-center">
  {partido.fecha}
</p>

</div>
))}
</div>
</div>

</div>
<div className="bg-white p-6 rounded-xl shadow mt-6">
  <h2 className="text-3xl font-black text-blue-900 mb-6">
    📅 Próximos Partidos
  </h2>

  <div className="space-y-4">

    {partidosActuales
      .filter(
        (partido) =>
          partido.estado !== "Finalizado" ||
          partido.puntosLocal === null ||
          partido.puntosVisitante === null
      )
      .slice(0, 3)
      .map((partido, index) => (
        <div
          key={index}
          className="bg-slate-50 border-l-8 border-blue-600 rounded-2xl p-5 shadow hover:shadow-lg transition"
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">

            <div className="flex items-center gap-3">

              <Image
                src={
                  equipos.find(
                    (e) => e.nombre === partido.local
                  )?.logo || "/logo.png"
                }
                alt={partido.local}
                width={70}
                height={70}
              />

              <p className="font-bold text-sm md:text-lg text-center">
                {partido.local}
              </p>

            </div>

            <div className="flex flex-col items-center">

              <span className="text-xs font-bold text-gray-500">
                LIBAVIME
              </span>

              <span className="text-2xl font-black text-blue-700">
                VS
              </span>

            </div>

            <div className="flex items-center gap-3">

              <p className="font-bold text-lg">
                {partido.visitante}
              </p>

              <Image
                src={
                  equipos.find(
                    (e) => e.nombre === partido.visitante
                  )?.logo || "/logo.png"
                }
                alt={partido.visitante}
                width={55}
                height={55}
              />

            </div>

          </div>

          <div className="mt-4 text-center">
            <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-bold">
              📅 {partido.fecha}
            </span>
          </div>

        </div>
      ))}

  </div>
</div>

<section className="mt-12">
  <div className="text-center mb-8">
    <h2 className="text-3xl md:text-4xl font-black text-blue-900">
      📊 ESTADÍSTICAS DE LOS JUGADORES
    </h2>

    <p className="text-slate-600 mt-2">
      Ranking general de los {jugadoresOrdenados.length} jugadores de LIBAVIME
    </p>
  </div>

  <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
    <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 md:px-6 py-4 grid grid-cols-[52px_minmax(180px,1fr)_70px_70px_70px_60px] md:grid-cols-[60px_minmax(260px,1fr)_90px_90px_90px_70px] gap-2 md:gap-4 items-center font-black text-sm md:text-base">
      <div className="text-center">POS</div>
      <div>JUGADOR</div>
      <div className="text-center">PPG</div>
      <div className="text-center">RPG</div>
      <div className="text-center">APG</div>
      <div className="text-center">PJ</div>
    </div>

    <div className="divide-y divide-slate-200">
      {jugadoresOrdenados.map((jugador, index) => {
        const medalla =
          index === 0 ? "🥇" :
          index === 1 ? "🥈" :
          index === 2 ? "🥉" :
          null;

        return (
          <Link
            key={jugador.id ?? jugador.slug ?? `${jugador.nombre}-${index}`}
            href={jugador.slug ? `/jugadores/${jugador.slug}` : "/jugadores"}
            className="px-4 md:px-6 py-3 grid grid-cols-[52px_minmax(180px,1fr)_70px_70px_70px_60px] md:grid-cols-[60px_minmax(260px,1fr)_90px_90px_90px_70px] gap-2 md:gap-4 items-center hover:bg-blue-50 transition"
          >
            <div className="text-center">
              {medalla ? (
                <span className="text-2xl">{medalla}</span>
              ) : (
                <span className="inline-flex w-9 h-9 items-center justify-center rounded-full bg-slate-100 text-blue-900 font-black">
                  {index + 1}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 min-w-0">
              <Image
                src={jugador.foto || "/logos/LIBAVIME.png"}
                alt={jugador.nombre || "Jugador LIBAVIME"}
                width={56}
                height={56}
                className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover bg-slate-100"
              />

              <div className="min-w-0">
                <p className="font-black text-slate-900 truncate">
                  {jugador.nombre}
                </p>

                <p className="text-xs md:text-sm text-slate-500 truncate">
                  {jugador.equipo || "Sin equipo"}
                </p>
              </div>
            </div>

            <div className="text-center font-black text-red-600">
              {Number(jugador.ppg).toFixed(1)}
            </div>

            <div className="text-center font-black text-purple-700">
              {Number(jugador.rpg).toFixed(1)}
            </div>

            <div className="text-center font-black text-amber-600">
              {Number(jugador.apg).toFixed(1)}
            </div>

            <div className="text-center font-bold text-slate-700">
              {jugador.partidos_jugados ?? 0}
            </div>
          </Link>
        );
      })}
    </div>
  </div>

  <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm font-bold">
    <span className="text-red-600">🏀 PPG: Puntos por partido</span>
    <span className="text-purple-700">💪 RPG: Rebotes por partido</span>
    <span className="text-amber-600">🎯 APG: Asistencias por partido</span>
    <span className="text-slate-700">📅 PJ: Partidos jugados</span>
  </div>
</section>
</div>

<footer className="mt-24 border-t border-slate-300 pt-12 pb-10 text-center">
  <p className="text-lg font-bold text-slate-700">
    🏀 LIBAVIME
  </p>

  <p className="text-sm text-slate-500 mt-3">
    © 2026 LIBAVIME · Diseñado y desarrollado por{" "}
    <span className="font-black text-blue-900">
      Emmi De La Cruz
    </span>
  </p>

  <p className="text-sm text-slate-400 mt-2">
    Creado para LIBAVIME
  </p>
</footer>

</main>

</>
);
}