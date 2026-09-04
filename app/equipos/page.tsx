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

export default function Equipos() {
  const [posiciones, setPosiciones] = useState<EquipoPosicion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarEquipos = async () => {
      try {
        setCargando(true);

        const { data: partidosData, error } = await supabase
          .from("partidos")
          .select("*")
          .eq("estado", "Finalizado");

        if (error) {
          console.error("Error cargando partidos:", error);

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

        const posicionesCalculadas = equipos.map(
          (equipo: any) => {
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
                console.log("PARTIDO:", partido);
console.log(
  "DATOS:",
  local,
  visitante,
  puntosLocal,
  puntosVisitante
);

                // Si no hay equipos, no procesar.
                if (!local || !visitante) {
                  return;
                }

                // Un marcador 0-0 es un partido sin resultado real.
                // No debe contar como JJ.
                if (
                  puntosLocal === 0 &&
                  puntosVisitante === 0
                ) {
                  return;
                }

                if (local === equipo.nombre) {
                  if (puntosLocal > puntosVisitante) {
                    ganados++;
                  }

                  if (puntosLocal < puntosVisitante) {
                    perdidos++;
                  }
                }

                if (visitante === equipo.nombre) {
                  if (puntosVisitante > puntosLocal) {
                    ganados++;
                  }

                  if (puntosVisitante < puntosLocal) {
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
          }
        );

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
      <main className="min-h-screen bg-slate-100 p-4 md:p-10">
        <div className="max-w-6xl mx-auto">
          <Navbar />

          <div className="min-h-[400px] flex items-center justify-center">
            <p className="text-xl font-bold text-blue-900">
              Cargando equipos...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-10">
      <div className="max-w-6xl mx-auto">
        <Navbar />

        <h1 className="text-4xl font-black text-center text-blue-900 mb-10">
          🏀 Equipos LIBAVIME
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posiciones.map((equipo) => (
            <Link
              key={equipo.nombre}
              href={`/equipos/${equipo.slug}`}
              className="bg-white rounded-2xl shadow-lg p-6 text-center block hover:scale-105 transition"
            >
              <Image
                src={equipo.logo}
                alt={equipo.nombre}
                width={180}
                height={180}
                className="mx-auto"
              />

              <h2 className="text-2xl font-bold mt-4">
                {equipo.nombre}
              </h2>

              <p className="text-gray-800">
                Récord:{" "}
                {equipo.ganados}-{equipo.perdidos}
              </p>

              <p className="text-gray-600 text-sm">
                JJ: {equipo.jj}
              </p>

              <p className="text-gray-600 text-sm">
                PCT: {equipo.pct}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}