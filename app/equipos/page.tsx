"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { equipos } from "../../data/equipos";
import Navbar from "../components/Navbar";

type EquipoPosicion = {
  nombre: string;
  slug: string;
  logo: string;
  ganados: number;
  perdidos: number;
  jj: number;
  pct: string;
};

const ORDEN_EQUIPOS = [
  "Gladiadores",
  "Vikingos",
  "Titanes",
  "Espartanos",
];

const ESTILOS_EQUIPOS: Record<
  string,
  {
    fondo: string;
    texto: string;
    borde: string;
  }
> = {
  Gladiadores: {
    fondo: "from-green-600 via-green-700 to-green-950",
    texto: "text-white",
    borde: "border-green-400",
  },

  Vikingos: {
    fondo: "from-purple-600 via-purple-700 to-purple-950",
    texto: "text-white",
    borde: "border-purple-400",
  },

  Titanes: {
    fondo: "from-red-600 via-red-700 to-red-950",
    texto: "text-white",
    borde: "border-red-400",
  },

  Espartanos: {
    fondo: "from-yellow-400 via-yellow-500 to-amber-600",
    texto: "text-slate-900",
    borde: "border-yellow-300",
  },
};

export default function Equipos() {
  const [posiciones, setPosiciones] = useState<
    EquipoPosicion[]
  >([]);

  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarEquipos = async () => {
      try {
        setCargando(true);

        const { data: partidosData, error } =
          await supabase
            .from("partidos")
            .select("*")
            .eq("estado", "Finalizado");

        if (error) {
          console.error(
            "Error cargando partidos:",
            error
          );

          setPosiciones(
            equipos.map((equipo: any) => ({
              ...equipo,
              ganados: 0,
              perdidos: 0,
              jj: 0,
              pct: ".000",
            }))
          );

          return;
        }

        const posicionesCalculadas =
          equipos.map((equipo: any) => {
            let ganados = 0;
            let perdidos = 0;

            (partidosData ?? []).forEach(
              (partido: any) => {
                const local =
                  partido.equipo_local ??
                  partido.local ??
                  "";

                const visitante =
                  partido.equipo_visitante ??
                  partido.visitante ??
                  "";

                const puntosLocal = Number(
                  partido.puntos_local ??
                    partido.puntosLocal ??
                    0
                );

                const puntosVisitante = Number(
                  partido.puntos_visitante ??
                    partido.puntosVisitante ??
                    0
                );

                if (!local || !visitante) {
                  return;
                }

                if (
                  puntosLocal === 0 &&
                  puntosVisitante === 0
                ) {
                  return;
                }

                const nombreEquipo = String(
                  equipo.nombre
                )
                  .trim()
                  .toLowerCase();

                const nombreLocal = String(local)
                  .trim()
                  .toLowerCase();

                const nombreVisitante =
                  String(visitante)
                    .trim()
                    .toLowerCase();

                if (
                  nombreLocal === nombreEquipo
                ) {
                  if (
                    puntosLocal > puntosVisitante
                  ) {
                    ganados++;
                  } else if (
                    puntosLocal < puntosVisitante
                  ) {
                    perdidos++;
                  }
                }

                if (
                  nombreVisitante === nombreEquipo
                ) {
                  if (
                    puntosVisitante > puntosLocal
                  ) {
                    ganados++;
                  } else if (
                    puntosVisitante < puntosLocal
                  ) {
                    perdidos++;
                  }
                }
              }
            );

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

        setPosiciones(posicionesCalculadas);
      } catch (error) {
        console.error(
          "Error inesperado cargando equipos:",
          error
        );

        setPosiciones(
          equipos.map((equipo: any) => ({
            ...equipo,
            ganados: 0,
            perdidos: 0,
            jj: 0,
            pct: ".000",
          }))
        );
      } finally {
        setCargando(false);
      }
    };

    cargarEquipos();
  }, []);

  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-4 md:px-8 md:py-8">
          <Navbar />

          <div className="min-h-[500px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-5" />

              <p className="text-xl font-bold text-blue-900">
                Cargando equipos...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const equiposOrdenados = ORDEN_EQUIPOS
    .map((nombre) =>
      posiciones.find(
        (equipo) => equipo.nombre === nombre
      )
    )
    .filter(Boolean) as EquipoPosicion[];

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-4 md:px-8 md:py-8">
        <Navbar />

        <section className="mt-8 mb-10 text-center">
          <p className="text-sm md:text-base font-bold tracking-[0.25em] text-blue-700 uppercase">
            LIBAVIME STATS
          </p>

          <h1 className="text-4xl md:text-5xl font-black text-blue-950 mt-2">
            🏀 Nuestros Equipos
          </h1>

          <p className="text-gray-600 mt-3 text-base md:text-lg">
            Conoce las cuatro franquicias que compiten
            en LIBAVIME 2026
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {equiposOrdenados.map((equipo) => {
            const estilo =
              ESTILOS_EQUIPOS[equipo.nombre] ??
              ESTILOS_EQUIPOS.Gladiadores;

            return (
              <Link
                key={equipo.nombre}
                href={`/equipos/${equipo.slug}`}
                className={`
                  group
                  relative
                  overflow-hidden
                  bg-gradient-to-br
                  ${estilo.fondo}
                  rounded-3xl
                  border
                  ${estilo.borde}
                  shadow-xl
                  hover:shadow-2xl
                  transition-all
                  duration-300
                  hover:-translate-y-2
                `}
              >
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />

                <div className="absolute -left-12 -bottom-12 w-44 h-44 rounded-full bg-black/10" />

                <div className="relative h-64 md:h-72 flex items-center justify-center p-8">
                 <Image
  src={equipo.logo}
  alt={`Logo ${equipo.nombre}`}
  width={equipo.nombre === "Titanes" ? 260 : 220}
  height={equipo.nombre === "Titanes" ? 260 : 220}
  className="
    max-h-full
    w-auto
    object-contain
    drop-shadow-2xl
    transition-transform
    duration-300
    group-hover:scale-110
  "
/>
                </div>

                <div
                  className={`
                    relative
                    px-6
                    pb-7
                    text-center
                    ${estilo.texto}
                  `}
                >
                  <h2 className="text-2xl md:text-3xl font-black">
                    {equipo.nombre}
                  </h2>

                  <p className="mt-2 font-semibold opacity-90">
                    Plantilla de jugadores
                  </p>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <div className="bg-black/20 backdrop-blur-sm rounded-xl py-3">
                      <p className="text-xs font-bold opacity-80">
                        JJ
                      </p>

                      <p className="text-xl font-black">
                        {equipo.jj}
                      </p>
                    </div>

                    <div className="bg-black/20 backdrop-blur-sm rounded-xl py-3">
                      <p className="text-xs font-bold opacity-80">
                        G
                      </p>

                      <p className="text-xl font-black">
                        {equipo.ganados}
                      </p>
                    </div>

                    <div className="bg-black/20 backdrop-blur-sm rounded-xl py-3">
                      <p className="text-xs font-bold opacity-80">
                        P
                      </p>

                      <p className="text-xl font-black">
                        {equipo.perdidos}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 bg-white/15 rounded-xl py-3 font-bold group-hover:bg-white/25 transition">
                    Ver plantilla →
                  </div>
                </div>
              </Link>
            );
          })}
        </section>

        <section className="mt-12 mb-10">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-blue-950 text-white px-6 py-5">
              <h2 className="text-2xl md:text-3xl font-black">
                🏆 Tabla de posiciones
              </h2>

              <p className="text-blue-200 mt-1">
                Temporada LIBAVIME 2026
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="text-left px-5 py-4 font-black">
                      Equipo
                    </th>

                    <th className="px-4 py-4 font-black">
                      JJ
                    </th>

                    <th className="px-4 py-4 font-black">
                      G
                    </th>

                    <th className="px-4 py-4 font-black">
                      P
                    </th>

                    <th className="px-4 py-4 font-black">
                      PCT
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {[...equiposOrdenados]
                    .sort(
                      (a, b) =>
                        b.ganados - a.ganados
                    )
                    .map((equipo, index) => (
                      <tr
                        key={equipo.nombre}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/equipos/${equipo.slug}`}
                            className="flex items-center gap-3 font-bold text-blue-950 hover:text-blue-700"
                          >
                            <span className="w-7 h-7 rounded-full bg-blue-950 text-white text-sm flex items-center justify-center font-black">
                              {index + 1}
                            </span>

                            <Image
                              src={equipo.logo}
                              alt={equipo.nombre}
                              width={42}
                              height={42}
                              className="w-10 h-10 object-contain"
                            />

                            <span>
                              {equipo.nombre}
                            </span>
                          </Link>
                        </td>

                        <td className="text-center px-4 py-4 font-bold">
                          {equipo.jj}
                        </td>

                        <td className="text-center px-4 py-4 font-black text-green-700">
                          {equipo.ganados}
                        </td>

                        <td className="text-center px-4 py-4 font-black text-red-600">
                          {equipo.perdidos}
                        </td>

                        <td className="text-center px-4 py-4 font-black text-blue-900">
                          {equipo.pct}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}