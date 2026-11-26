"use client";

import { useState } from "react";
import Image from "next/image";
import { useLiga } from "@/app/components/LigaContext";

export default function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { ruta, nombre, logo } = useLiga();

  return (
    <nav className="absolute top-0 left-0 right-0 z-20 px-4 pt-2">

      <div className="max-w-6xl mx-auto">

        <div className="bg-blue-950/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/10">

          {/* PC */}
          <div className="hidden md:flex items-center justify-center gap-8 text-white font-semibold py-4">

            <Image
              src={logo}
              alt={nombre}
              width={42}
              height={42}
              className="object-contain"
            />

            <a href={ruta("/")}>🏠 Inicio</a>
            <a href={ruta("/equipos")}>🏀 Equipos</a>
            <a href={ruta("/jugadores")}>👤 Jugadores</a>
            <a href={ruta("/calendario")}>📅 Calendario</a>
            <a href={ruta("/resultados")}>🏆 Resultados</a>
            <a href={ruta("/clasificacion")}>🏆 Clasificación</a>
            <a href={ruta("/estadisticas")}>📊 Estadísticas</a>
            <a href={ruta("/mvp")}>🥇 MVP</a>

          </div>

          {/* Móvil */}
          <div className="md:hidden">

            <button
              onClick={() => setMenuAbierto(!menuAbierto)}
              className="w-full flex justify-between items-center px-4 py-3 text-white"
            >
              <div className="flex-1 flex justify-center items-center gap-3">

                <Image
                  src={logo}
                  alt={nombre}
                  width={38}
                  height={38}
                  className="object-contain"
                />

                <span className="font-black text-lg">
                  {nombre}
                </span>

              </div>

              <span className="text-2xl">
                ☰
              </span>
            </button>

            {menuAbierto && (
              <div className="flex flex-col text-center text-white pb-4 gap-3">

                <a href={ruta("/")}>🏠 Inicio</a>
                <a href={ruta("/equipos")}>🏀 Equipos</a>
                <a href={ruta("/jugadores")}>👤 Jugadores</a>
                <a href={ruta("/calendario")}>📅 Calendario</a>
                <a href={ruta("/resultados")}>🏆 Resultados</a>
                <a href={ruta("/clasificacion")}>🏆 Clasificación</a>
                <a href={ruta("/estadisticas")}>📊 Estadísticas</a>
                <a href={ruta("/mvp")}>🥇 MVP</a>

              </div>
            )}

          </div>

        </div>

      </div>

    </nav>
  );
}
