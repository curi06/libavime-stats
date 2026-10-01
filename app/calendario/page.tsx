"use client";

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { supabase } from "@/lib/supabase";

type Partido = {
  id: number;
  local: string;
  visitante: string;
  fecha: string;
  hora: string | null;
  cancha: string | null;
  puntosLocal: number | null;
  puntosVisitante: number | null;
  estado: string | null;
};

function formatearFecha(fecha: string) {
  if (!fecha) return "";

  const partes = fecha.split("-");

  if (partes.length !== 3) return fecha;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obtenerLogoEquipo(nombre: string) {
  const equipo = nombre.toLowerCase().trim();

  if (equipo.includes("gladiadores")) return "/logos/gladiadores.png";
  if (equipo.includes("espartanos")) return "/logos/espartanos.png";
  if (equipo.includes("titanes")) return "/logos/titanes.jpg";
  if (equipo.includes("vikingos")) return "/logos/vikingos.jpg";

  return null;
}

function obtenerDia(fecha: string) {
  if (!fecha) return "";

  const [year, month, day] = fecha.split("-").map(Number);
  if (!year || !month || !day) return "";

  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("es-DO", {
    weekday: "long",
  }).format(date);
}

export default function Calendario() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarPartidos() {
      setCargando(true);

      const { data, error } = await supabase
        .from("partidos")
        .select(
          `
          id,
          equipo_local,
          equipo_visitante,
          fecha,
          hora,
          cancha,
          puntos_local,
          puntos_visitante,
          estado
        `
        )
        .order("fecha", { ascending: true })
        .order("hora", { ascending: true });

      if (error) {
        console.error("Error al cargar calendario:", error);
        setCargando(false);
        return;
      }

      const partidosFormateados: Partido[] = (data ?? []).map(
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

      setPartidos(partidosFormateados);
      setCargando(false);
    }

    cargarPartidos();
  }, []);

  const proximosPartidos = partidos.filter((partido) => {
    const estado = partido.estado?.toLowerCase().trim();

    return estado !== "finalizado" && estado !== "finalizada";
  });

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[#050b18] pt-28 pb-12 px-3 sm:px-5 md:pt-32">
        {/* FONDO DEPORTIVO */}
        <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(220,38,38,0.18),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(37,99,235,0.20),transparent_32%),linear-gradient(135deg,#050b18_0%,#0b1224_50%,#050814_100%)]" />
          <div className="absolute -left-32 top-80 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />
          <div className="absolute -right-32 top-96 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl">
          {/* ENCABEZADO */}
          <div className="mb-7 text-center sm:mb-10">
            <div className="mx-auto mb-5 flex max-w-fit items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 shadow-2xl backdrop-blur">
              <span className="text-xl">🏀</span>
              <span className="text-xs font-black tracking-[0.18em] text-white sm:text-sm">
                LIBAVIME 2026
              </span>
            </div>

            <h1 className="text-4xl font-black uppercase italic tracking-tight text-white drop-shadow-2xl sm:text-5xl md:text-6xl">
              Calendario
            </h1>

            <div className="mx-auto mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-red-600 via-red-500 to-blue-600" />

            <p className="mt-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-400 sm:text-sm">
              Próximos partidos
            </p>
          </div>

          {/* CARGANDO */}
          {cargando ? (
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 p-12 text-center shadow-2xl backdrop-blur">
              <div className="mb-4 text-5xl animate-bounce">🏀</div>
              <p className="font-black uppercase tracking-wider text-white">
                Cargando calendario...
              </p>
            </div>
          ) : proximosPartidos.length === 0 ? (
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 p-12 text-center shadow-2xl backdrop-blur">
              <div className="mb-4 text-5xl">📅</div>
              <p className="text-lg font-black text-white">
                No hay próximos partidos programados.
              </p>
            </div>
          ) : (
            <div className="grid gap-7 lg:grid-cols-2">
              {proximosPartidos.map((partido) => {
                const logoLocal = obtenerLogoEquipo(partido.local);
                const logoVisitante = obtenerLogoEquipo(partido.visitante);

                return (
                  <article
                    key={partido.id}
                    className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#080f20]/95 shadow-[0_25px_80px_rgba(0,0,0,0.45)]"
                  >
                    {/* BRILLOS */}
                    <div className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-red-600/15 blur-3xl" />
                    <div className="pointer-events-none absolute -right-24 top-20 h-64 w-64 rounded-full bg-blue-600/15 blur-3xl" />

                    {/* CABECERA */}
                    <div className="relative flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#121d45] via-[#16285b] to-[#101a3b] px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏀</span>
                        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-white sm:text-xs">
                          Próximo partido
                        </span>
                      </div>

                      <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-300">
                        LIBAVIME
                      </span>
                    </div>

                    {/* ENFRENTAMIENTO */}
                    <div className="relative px-4 pb-5 pt-7 sm:px-7 sm:pt-8">
                      <div className="flex items-center justify-between gap-2 sm:gap-4">
                        {/* LOCAL */}
                        <div className="min-w-0 flex-1 text-center">
                          <div className="mx-auto flex h-32 w-full max-w-[190px] items-center justify-center rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-950/80 to-red-900/20 p-3 shadow-[inset_0_0_40px_rgba(220,38,38,0.12)] sm:h-40 sm:max-w-[210px]">
                            {logoLocal ? (
                              <img
                                src={logoLocal}
                                alt={`Logo ${partido.local}`}
                                className="h-full w-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
                              />
                            ) : (
                              <span className="text-5xl">🏀</span>
                            )}
                          </div>

                          <h2 className="mt-4 truncate text-base font-black uppercase italic tracking-tight text-white sm:text-xl">
                            {partido.local}
                          </h2>

                          <span className="mt-1 inline-block rounded-full bg-red-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-red-400">
                            Local
                          </span>
                        </div>

                        {/* VS */}
                        <div className="relative flex w-20 shrink-0 items-center justify-center sm:w-24">
                          <div className="absolute h-20 w-20 rounded-full bg-red-600/20 blur-2xl sm:h-28 sm:w-28" />

                          <span className="absolute translate-x-2 translate-y-2 text-[54px] font-black italic leading-none tracking-tighter text-black/70 sm:text-[72px]">
                            VS
                          </span>

                          <span
                            className="relative z-10 text-[52px] font-black italic leading-none tracking-tighter text-red-500 sm:text-[70px]"
                            style={{
                              textShadow:
                                "0 4px 0 #7f1d1d, 0 8px 18px rgba(0,0,0,0.65)",
                            }}
                          >
                            VS
                          </span>
                        </div>

                        {/* VISITANTE */}
                        <div className="min-w-0 flex-1 text-center">
                          <div className="mx-auto flex h-32 w-full max-w-[190px] items-center justify-center rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/80 to-blue-900/20 p-3 shadow-[inset_0_0_40px_rgba(37,99,235,0.12)] sm:h-40 sm:max-w-[210px]">
                            {logoVisitante ? (
                              <img
                                src={logoVisitante}
                                alt={`Logo ${partido.visitante}`}
                                className="h-full w-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
                              />
                            ) : (
                              <span className="text-5xl">🏀</span>
                            )}
                          </div>

                          <h2 className="mt-4 truncate text-base font-black uppercase italic tracking-tight text-white sm:text-xl">
                            {partido.visitante}
                          </h2>

                          <span className="mt-1 inline-block rounded-full bg-blue-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-blue-400">
                            Visitante
                          </span>
                        </div>
                      </div>

                      {/* INFORMACIÓN */}
                      <div className="mt-7 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-center">
                          <div className="text-2xl">📅</div>
                          <p className="mt-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                            Fecha
                          </p>
                          <p className="mt-1 text-lg font-black text-white">
                            {formatearFecha(partido.fecha)}
                          </p>
                          <p className="text-[10px] font-bold uppercase text-red-400">
                            {obtenerDia(partido.fecha)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-center">
                          <div className="text-2xl">🕒</div>
                          <p className="mt-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                            Hora
                          </p>
                          <p className="mt-1 text-lg font-black text-white">
                            {partido.hora || "Por confirmar"}
                          </p>
                        </div>

                        <div className="col-span-2 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.035] via-white/[0.055] to-white/[0.035] p-4 text-center">
                          <div className="text-2xl">📍</div>
                          <p className="mt-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                            Lugar
                          </p>
                          <p className="mt-1 text-base font-black uppercase text-white sm:text-lg">
                            {partido.cancha || "Por confirmar"}
                          </p>
                        </div>
                      </div>

                      {/* ESTADO */}
                      <div className="mt-5 flex justify-center">
                        <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-5 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-yellow-300">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.9)]" />
                          Próximamente
                        </span>
                      </div>
                    </div>

                    {/* PIE */}
                    <div className="border-t border-white/10 bg-black/20 px-5 py-3 text-center">
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                        Liga de Baloncesto de Visitadores a Médicos
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
