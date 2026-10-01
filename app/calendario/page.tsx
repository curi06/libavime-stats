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

if (partes.length !== 3) {
return fecha;
}

return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obtenerLogoEquipo(nombre: string) {
  const equipo = nombre.toLowerCase().trim();

  if (equipo.includes("gladiadores")) {
    return "/logos/gladiadores.png";
  }

  if (equipo.includes("espartanos")) {
    return "/logos/espartanos.png";
  }

  if (equipo.includes("titanes")) {
    return "/logos/titanes.jpg";
  }

  if (equipo.includes("vikingos")) {
    return "/logos/vikingos.jpg";
  }

  return null;
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

return (
  estado !== "finalizado" &&
  estado !== "finalizada"
);

});

return (
<> <Navbar />

  <main className="min-h-screen bg-slate-100 pt-32 pb-10 px-3 sm:px-5 md:pt-28 md:px-8">
    <div className="max-w-5xl mx-auto">

      {/* ENCABEZADO */}
      <div className="text-center mb-7 md:mb-10">

        <div className="inline-flex items-center gap-2 bg-blue-950 text-white px-4 py-2 rounded-full text-xs sm:text-sm font-black shadow-md mb-3">
          🏀 LIBAVIME 2026
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-blue-950">
          Calendario
        </h1>

        <p className="text-gray-500 mt-2 text-sm sm:text-base">
          Próximos partidos
        </p>

      </div>

      {/* CARGANDO */}
      {cargando ? (

        <div className="bg-white rounded-2xl shadow-lg p-10 text-center">

          <div className="text-4xl mb-3">
            🏀
          </div>

          <p className="font-bold text-gray-600">
            Cargando calendario...
          </p>

        </div>

      ) : proximosPartidos.length === 0 ? (

        /* SIN PARTIDOS */
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center">

          <div className="text-5xl mb-4">
            📅
          </div>

          <p className="font-bold text-gray-600 text-lg">
            No hay próximos partidos programados.
          </p>

        </div>

      ) : (

        <div className="space-y-5 md:space-y-7">

          {proximosPartidos.map((partido) => {

            const logoLocal = obtenerLogoEquipo(partido.local);
            const logoVisitante = obtenerLogoEquipo(partido.visitante);

            return (
              <div
                key={partido.id}
                className="bg-white rounded-2xl md:rounded-3xl shadow-lg overflow-hidden border border-slate-200"
              >

                {/* CABECERA */}
                <div className="bg-gradient-to-r from-blue-950 to-blue-800 px-4 sm:px-5 py-3 flex items-center justify-between">

                  <span className="text-white font-black text-xs sm:text-sm">
                    🏀 PRÓXIMO PARTIDO
                  </span>

                  <span className="text-white/80 text-[10px] sm:text-xs font-bold">
                    LIBAVIME
                  </span>

                </div>

                <div className="p-4 sm:p-6 md:p-8">

                  {/* EQUIPOS */}
<div className="w-full">

  <div className="flex items-center justify-center gap-1 sm:gap-4 md:gap-8">

    {/* GLADIADORES */}
    <div className="flex-1 min-w-0 text-center">

      <div className="h-24 w-full sm:h-32 md:h-40 flex items-center justify-center">
        {logoLocal ? (
          <img
            src={logoLocal}
            alt={`Logo ${partido.local}`}
            className="h-full w-full object-contain drop-shadow-xl"
          />
        ) : (
          <span className="text-5xl">🏀</span>
        )}
      </div>

      <h2 className="mt-2 text-sm sm:text-xl md:text-2xl font-black text-blue-950 uppercase leading-tight">
        {partido.local}
      </h2>

      <p className="mt-1 text-[9px] sm:text-xs font-black text-gray-400">
        LOCAL
      </p>

    </div>


{/* VS CENTRAL */}

<div className="flex-none w-24 sm:w-32 md:w-40 flex items-center justify-center">

  <div className="relative flex items-center justify-center -translate-y-3 sm:-translate-y-4 md:-translate-y-5">

```
{/* Resplandor rojo */}
<div className="absolute w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 bg-red-600/30 blur-2xl rounded-full"></div>

{/* Sombra */}
<span
  className="absolute translate-x-2 translate-y-3 text-[70px] sm:text-[95px] md:text-[125px] font-black italic tracking-tighter text-black/25 leading-none"
>
  VS
</span>

{/* VS ROJO */}
<span
  className="relative z-10 text-[68px] sm:text-[92px] md:text-[120px] font-black italic tracking-tighter leading-none text-red-600"
  style={{
    textShadow:
      "0 5px 0 #991b1b, 0 9px 18px rgba(0,0,0,0.4)",
  }}
>
  VS
</span>
```

  </div>

</div>



    {/* TITANES */}
    <div className="flex-1 min-w-0 text-center">

      <div className="h-24 w-full sm:h-32 md:h-40 flex items-center justify-center">
        {logoVisitante ? (
          <img
            src={logoVisitante}
            alt={`Logo ${partido.visitante}`}
            className="h-full w-full object-contain drop-shadow-xl"
          />
        ) : (
          <span className="text-5xl">🏀</span>
        )}
      </div>

      <h2 className="mt-2 text-sm sm:text-xl md:text-2xl font-black text-blue-950 uppercase leading-tight">
        {partido.visitante}
      </h2>

      <p className="mt-1 text-[9px] sm:text-xs font-black text-gray-400">
        VISITANTE
      </p>

    </div>

  </div>

</div>

                  {/* SEPARADOR */}
                  <div className="border-t border-slate-100 mt-5 sm:mt-7 pt-5 sm:pt-6">

                    {/* INFORMACIÓN */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">

                      {/* FECHA */}
                      <div className="bg-slate-50 rounded-xl p-3 sm:p-4 text-center border border-slate-200">

                        <div className="text-xl sm:text-2xl">
                          📅
                        </div>

                        <p className="text-[9px] sm:text-xs text-gray-400 font-black uppercase mt-1">
                          Fecha
                        </p>

                        <p className="text-sm sm:text-lg font-black text-blue-950 mt-1">
                          {formatearFecha(partido.fecha)}
                        </p>

                      </div>

                      {/* HORA */}
                      <div className="bg-slate-50 rounded-xl p-3 sm:p-4 text-center border border-slate-200">

                        <div className="text-xl sm:text-2xl">
                          🕒
                        </div>

                        <p className="text-[9px] sm:text-xs text-gray-400 font-black uppercase mt-1">
                          Hora
                        </p>

                        <p className="text-sm sm:text-lg font-black text-blue-950 mt-1">
                          {partido.hora || "Por confirmar"}
                        </p>

                      </div>

                      {/* LUGAR */}
                      <div className="col-span-2 md:col-span-1 bg-slate-50 rounded-xl p-3 sm:p-4 text-center border border-slate-200">

                        <div className="text-xl sm:text-2xl">
                          📍
                        </div>

                        <p className="text-[9px] sm:text-xs text-gray-400 font-black uppercase mt-1">
                          Lugar
                        </p>

                        <p className="text-sm sm:text-lg font-black text-blue-950 mt-1 leading-tight">
                          {partido.cancha || "Por confirmar"}
                        </p>

                      </div>

                    </div>

                  </div>

                  {/* ESTADO */}
                  <div className="text-center mt-5">

                    <span className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 border border-yellow-200 px-4 sm:px-5 py-2 rounded-full font-black text-xs sm:text-sm">

                      <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />

                      PRÓXIMAMENTE

                    </span>

                  </div>

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
