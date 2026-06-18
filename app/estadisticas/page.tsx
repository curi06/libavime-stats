
"use client";

import Navbar from "../components/Navbar";
import Image from "next/image";
import Link from "next/link";


import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
export default function Estadisticas() {
  const [tabla, setTabla] = useState<any[]>([]);
  const [jugadores, setJugadores] = useState<any[]>([]);
    
  const lideresPuntos = [...jugadores]
    .sort((a, b) => b.ppg - a.ppg)
    .slice(0, 10);

  const lideresRebotes = [...jugadores]
    .sort((a, b) => b.rpg - a.rpg)
    .slice(0, 10);

  const lideresAsistencias = [...jugadores]
    .sort((a, b) => b.apg - a.apg)
    .slice(0, 10);
const mvp =
  jugadores.length > 0
    ? [...jugadores].sort(
        (a, b) => b.ppg - a.ppg
      )[0]
    : null;
    
    useEffect(() => {
  cargarTabla();
  cargarJugadores();
}, []);

async function cargarJugadores() {
 const { data } = await supabase
  .from("jugadores")
  .select("*")
  .order("nombre");
  if (data) {
    setJugadores(data);
  }
}
    if (!mvp) {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-2xl font-bold">
        Cargando estadísticas...
      </h1>
    </main>
  );
}
async function cargarTabla() {
  const { data } = await supabase
    .from("partidos")
    .select("*")
    .eq("estado", "Finalizado");

  if (!data) return;

  const posiciones: any = {};

  data.forEach((partido) => {
    const local =
  partido.equipo_local ||
  "LOCAL VACIO";

const visitante =
  partido.equipo_visitante ||
  "VISITANTE VACIO";
    if (!posiciones[local]) {
      posiciones[local] = {
        equipo: local,
        pj: 0,
        pg: 0,
        pp: 0,
        pts: 0,
      };
    }

    if (!posiciones[visitante]) {
      posiciones[visitante] = {
        equipo: visitante,
        pj: 0,
        pg: 0,
        pp: 0,
        pts: 0,
      };
    }

    posiciones[local].pj++;
    posiciones[visitante].pj++;

    if (
      partido.puntos_local >
      partido.puntos_visitante
    ) {
      posiciones[local].pg++;
      posiciones[local].pts += 2;

      posiciones[visitante].pp++;
      posiciones[visitante].pts += 1;
    } else {
      posiciones[visitante].pg++;
      posiciones[visitante].pts += 2;

      posiciones[local].pp++;
      posiciones[local].pts += 1;
    }
  });

  const tablaFinal = Object.values(
    posiciones
  ).sort(
    (a: any, b: any) =>
      b.pts - a.pts
  );

  setTabla(tablaFinal);
}
  return (
  <>
    <Navbar />

    <main className="min-h-screen bg-slate-100 pt-24 p-4 md:p-10">
      <div className="max-w-6xl mx-auto">

        <h1 className="text-4xl font-black text-center text-blue-900 mb-10">
          📊 Estadísticas LIBAVIME
        </h1>
        <Link
  href={`/jugadores/${mvp.slug}`}
  className="block bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-2xl p-8 shadow-lg mb-10 hover:scale-[1.01] transition"
>

  <div className="flex flex-col md:flex-row items-center justify-center gap-6">

   <Image
  src={
    mvp.foto?.startsWith("/")
      ? mvp.foto
      : "/logos/LIBAVIME.png"
  }
  alt={mvp.nombre}
  width={160}
  height={160}
  className="rounded-full border-4 border-white object-cover"
/>

    <div className="text-center">

      <h2 className="text-4xl font-black">
        🏆 MVP DE LA LIGA
      </h2>

      <p className="text-3xl font-bold mt-4">
        {mvp.nombre}
      </p>

      <p className="text-xl">
        {mvp.equipo}
      </p>

      <p className="text-5xl font-black mt-3">
        {mvp.ppg} PPG
      </p>

      <Image
  src="/logos/LIBAVIME.png"
  alt="LIBAVIME"
  width={64}
  height={64}
  className="mx-auto mt-4"
/>
    </div>

  </div>

</Link>

        <div className="grid md:grid-cols-3 gap-6">

          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-bold mb-4">
              🏀 Top Anotadores
            </h2>

            {lideresPuntos.map((jugador, index) => (
              <p key={jugador.nombre}>
                {index + 1}. {jugador.nombre} - {jugador.ppg} PPG
              </p>
            ))}
          </div>
          <div className="bg-white p-6 rounded-xl shadow mt-8">

  <h2 className="text-2xl font-bold mb-4">
    🏆 Tabla de Posiciones
  </h2>

  <table className="w-full text-left">
    <thead>
      <tr className="border-b">
        <th>Pos</th>
        <th>Equipo</th>
        <th>PJ</th>
        <th>PG</th>
        <th>PP</th>
        <th>PTS</th>
      </tr>
    </thead>
<tbody>
  {tabla.map((equipo, index) => (
    <tr key={equipo.equipo}>
      <td>{index + 1}</td>
      <td>{equipo.equipo}</td>
      <td>{equipo.pj}</td>
      <td>{equipo.pg}</td>
      <td>{equipo.pp}</td>
      <td>{equipo.pts}</td>
    </tr>
  ))}
</tbody>
  </table>

</div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-bold mb-4">
              💪 Top Reboteadores
            </h2>

            {lideresRebotes.map((jugador, index) => (
              <p key={jugador.nombre}>
                {index + 1}. {jugador.nombre} - {jugador.rpg} RPG
              </p>
            ))}
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-bold mb-4">
              🎯 Top Asistidores
            </h2>

            {lideresAsistencias.map((jugador, index) => (
              <p key={jugador.nombre}>
                {index + 1}. {jugador.nombre} - {jugador.apg} APG
              </p>
            ))}
          </div>

        </div>

            </div>
    </main>
  </>
  );
}