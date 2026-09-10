"use client";

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { supabase } from "@/lib/supabase";
import { equipos } from "../../data/equipos";
import Image from "next/image";

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

export default function Resultados() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarResultados() {
      setCargando(true);

      const { data, error } = await supabase
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
        .order("fecha", { ascending: false })
        .order("hora", { ascending: false });

      if (error) {
        console.error("Error al cargar resultados:", error);
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

    cargarResultados();
  }, []);

  const resultados = partidos.filter(
    (partido) =>
      partido.puntosLocal !== null &&
      partido.puntosVisitante !== null
  );

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-100 pt-24 p-4 md:p-10">
        <div className="max-w-5xl mx-auto">

          <h1 className="text-4xl font-black text-center text-blue-900 mb-10">
            🏆 Resultados LIBAVIME
          </h1>

          {cargando ? (
            <div className="bg-white rounded-2xl shadow p-10 text-center">
              <p className="text-xl font-bold text-gray-600">
                Cargando resultados...
              </p>
            </div>
          ) : resultados.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-10 text-center">
              <p className="text-xl font-bold text-gray-600">
                Aún no hay resultados registrados.
              </p>
            </div>
          ) : (
            <div className="space-y-4">

              {resultados.map((partido) => {
                const equipoLocal = equipos.find(
                  (equipo) =>
                    equipo.nombre.trim().toLowerCase() ===
                    partido.local.trim().toLowerCase()
                );

                const equipoVisitante = equipos.find(
                  (equipo) =>
                    equipo.nombre.trim().toLowerCase() ===
                    partido.visitante.trim().toLowerCase()
                );

                const puntosLocal = partido.puntosLocal ?? 0;
                const puntosVisitante =
                  partido.puntosVisitante ?? 0;

                const ganoLocal =
                  puntosLocal > puntosVisitante;

                const ganoVisitante =
                  puntosVisitante > puntosLocal;

                return (
                  <div
                    key={partido.id}
                    className="bg-white rounded-xl shadow p-4 md:p-6"
                  >
                    <div className="flex items-center justify-between gap-2 md:gap-6">

                      {/* LOCAL */}
                      <div className="text-center flex-1 min-w-0">

                        {equipoLocal?.logo && (
                          <Image
                            src={equipoLocal.logo}
                            alt={partido.local}
                            width={80}
                            height={80}
                            className="mx-auto mb-2 w-16 h-16 md:w-20 md:h-20 object-contain"
                          />
                        )}

                        <p
                          className={`font-bold text-base md:text-xl break-words ${
                            ganoLocal
                              ? "text-green-600"
                              : "text-gray-800"
                          }`}
                        >
                          {partido.local}
                        </p>

                        <p
                          className={`text-4xl md:text-5xl font-black mt-2 ${
                            ganoLocal
                              ? "text-green-600"
                              : "text-blue-900"
                          }`}
                        >
                          {puntosLocal}
                        </p>

                      </div>

                      {/* FINAL */}
                      <div className="text-center px-1 md:px-6 shrink-0">

                        <p className="font-black text-base md:text-2xl text-green-600">
                          FINAL
                        </p>

                        <p className="text-gray-400 text-xs md:text-sm mt-1">
                          VS
                        </p>

                      </div>

                      {/* VISITANTE */}
                      <div className="text-center flex-1 min-w-0">

                        {equipoVisitante?.logo && (
                          <Image
                            src={equipoVisitante.logo}
                            alt={partido.visitante}
                            width={80}
                            height={80}
                            className="mx-auto mb-2 w-16 h-16 md:w-20 md:h-20 object-contain"
                          />
                        )}

                        <p
                          className={`font-bold text-base md:text-xl break-words ${
                            ganoVisitante
                              ? "text-green-600"
                              : "text-gray-800"
                          }`}
                        >
                          {partido.visitante}
                        </p>

                        <p
                          className={`text-4xl md:text-5xl font-black mt-2 ${
                            ganoVisitante
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {puntosVisitante}
                        </p>

                      </div>

                    </div>

                    <div className="text-center mt-6 pt-4 border-t">

                      <p className="font-semibold text-gray-600">
                        📅 {partido.fecha}
                        {partido.hora && ` — 🕒 ${partido.hora}`}
                      </p>

                      {partido.cancha && (
                        <p className="text-sm text-gray-500 mt-1">
                          📍 {partido.cancha}
                        </p>
                      )}

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </div>
      </main>
    </>
  );
}