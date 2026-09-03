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

export default function Calendario() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarPartidos() {
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

  // Mostrar solo partidos que todavía no tienen resultado
  const proximosPartidos = partidos.filter(
    (partido) =>
      partido.puntosLocal === null ||
      partido.puntosVisitante === null
  );

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-100 pt-24 p-4 md:p-10">
        <div className="max-w-5xl mx-auto">

          <h1 className="text-4xl font-black text-center text-blue-900 mb-10">
            📅 Calendario LIBAVIME
          </h1>

          {cargando ? (
            <div className="bg-white p-10 rounded-2xl shadow text-center">
              <p className="font-bold text-gray-600">
                Cargando calendario...
              </p>
            </div>
          ) : proximosPartidos.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl shadow text-center">
              <p className="font-bold text-gray-600">
                No hay próximos partidos programados.
              </p>
            </div>
          ) : (
            <div className="space-y-4">

              {proximosPartidos.map((partido) => (
                <div
                  key={partido.id}
                  className="bg-white p-6 rounded-xl shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                    <div>
                      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">

  <h2 className="text-xl md:text-2xl font-black text-blue-900 text-center">
    {partido.local}
  </h2>

  <span className="inline-flex items-center justify-center bg-red-600 text-white text-2xl md:text-4xl font-black italic px-5 py-2 md:px-7 md:py-3 rounded-xl shadow-lg border-2 border-red-300">
    VS
  </span>

  <h2 className="text-xl md:text-2xl font-black text-blue-900 text-center">
    {partido.visitante}
  </h2>

</div>
                      <p className="text-gray-600 mt-2">
                        📅 {partido.fecha}
                      </p>

                      {partido.hora && (
                        <p className="text-gray-600 mt-1">
                          🕒 {partido.hora}
                        </p>
                      )}

                      {partido.cancha && (
                        <p className="text-gray-600 mt-1">
                          📍 {partido.cancha}
                        </p>
                      )}
                    </div>

                    <div className="md:text-right">
                      <span className="inline-block bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full font-bold">
                        ⏳ PRÓXIMAMENTE
                      </span>
                    </div>

                  </div>
                </div>
              ))}

            </div>
          )}

        </div>
      </main>
    </>
  );
}