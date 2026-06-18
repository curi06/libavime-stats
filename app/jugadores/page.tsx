"use client";

import Navbar from "../components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Jugadores() {
  const [jugadores, setJugadores] = useState<any[]>([]);

  useEffect(() => {
    cargarJugadores();
  }, []);

  async function cargarJugadores() {
  const { data, error } = await supabase
    .from("jugadores")
    .select("*")
    .order("nombre");

  console.log("JUGADORES LISTA:", data);
  console.log("ERROR LISTA:", error);

  if (data) {
    setJugadores(data);
  }
}
  if (jugadores.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl font-bold">
          Cargando jugadores...
        </h1>
      </main>
    );
  }

 
  return (
  <>
    <Navbar />

    <main className="min-h-screen bg-slate-100 pt-24 p-4 md:p-10">
      <div className="max-w-6xl mx-auto">

        <h1 className="text-4xl font-black text-center text-blue-900 mb-10">
          👤 Jugadores LIBAVIME
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {jugadores.map((jugador) => (
  <Link
    key={jugador.nombre}
    href={`/jugadores/${jugador.slug}`}
    className="bg-white p-6 rounded-2xl shadow-lg text-center hover:scale-105 transition block"
  >
            <div className="w-48 h-48 mx-auto mb-4 overflow-hidden rounded-full border-4 border-blue-900">
  <Image
  src={
    jugador.foto &&
    jugador.foto.startsWith("/")
      ? jugador.foto
      : "/logos/LIBAVIME.png"
  }
  alt={jugador.nombre}
  width={160}
  height={160}
  className="w-full h-full object-cover scale-125"
/>
</div>
<Image
  src="/logos/LIBAVIME.png"
  alt="LIBAVIME"
  width={60}
  height={60}
  className="mx-auto mb-2"
/>

<h2 className="text-xl font-bold">
  {jugador.nombre}
</h2>

<p className="text-gray-600">
  #{jugador.numero} • {jugador.posicion}
</p>

<p>Equipo: {jugador.equipo}</p>

<div className="grid grid-cols-3 gap-2 mt-4">
  <div className="bg-blue-100 rounded-lg p-2">
    <p className="text-xs font-semibold">PPG</p>
    <p className="text-xl font-bold">{jugador.ppg}</p>
  </div>

  <div className="bg-green-100 rounded-lg p-2">
    <p className="text-xs font-semibold">RPG</p>
    <p className="text-xl font-bold">{jugador.rpg}</p>
  </div>

  <div className="bg-yellow-100 rounded-lg p-2">
    <p className="text-xs font-semibold">APG</p>
    <p className="text-xl font-bold">{jugador.apg}</p>
  </div>
</div>
            </Link>
                   ))}
        </div>

      </div>

    </main>
  </>
);
}