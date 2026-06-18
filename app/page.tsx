"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { jugadores } from "../data/jugadores";
import { partidos } from "../data/partidos";
import { equipos } from "../data/equipos";

export default function Home(){
  const [menuAbierto, setMenuAbierto] = useState(false);

  const lideresPuntos = [...jugadores]
    .sort((a, b) => b.ppg - a.ppg)
    .slice(0, 3);

  const lideresRebotes = [...jugadores]
    .sort((a, b) => b.rpg - a.rpg)
    .slice(0, 3);

  const lideresAsistencias = [...jugadores]
    .sort((a, b) => b.apg - a.apg)
    .slice(0, 3);
  const posiciones = equipos.map((equipo) => {
  let ganados = 0;
  let perdidos = 0;

  partidos.forEach((partido) => {
    if (
      partido.puntosLocal === 0 &&
      partido.puntosVisitante === 0
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
const ultimosResultados = [...partidos]
  .filter(
    (partido) =>
      partido.puntosLocal > 0 ||
      partido.puntosVisitante > 0
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
    {partidos.length}
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
<Link
  href="/mvp"
  className="block mt-8 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-3xl p-6 shadow-xl hover:scale-[1.02] transition"
>
  <div className="flex flex-col md:flex-row items-center gap-6">

    <Image
      src={lideresPuntos[0].foto}
      alt={lideresPuntos[0].nombre}
      width={120}
      height={120}
      className="rounded-full border-4 border-white"
    />

    <div className="text-center md:text-left text-white">

      <h2 className="text-xl md:text-3xl font-black">
        🏆 MVP LIBAVIME 2026
      </h2>

      <p className="text-2xl font-bold mt-2">
        {lideresPuntos[0].nombre}
      </p>

      <p>
        {lideresPuntos[0].equipo}
      </p>

      <p className="text-5xl font-black mt-2">
        {lideresPuntos[0].ppg} PPG
      </p>

    </div>

  </div>
</Link>

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

        <div className="grid grid-cols-2 md:grid-cols-2 md:grid-cols-4 gap-4 mt-10">



</div> 
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">

  {posicionesOrdenadas.slice(0, 3).map((equipo, index) => {

    const colores = [
      "from-yellow-300 to-yellow-500",
      "from-gray-300 to-gray-500",
      "from-orange-300 to-orange-500",
    ];

    const medallas = ["🥇", "🥈", "🥉"];

    return (
      <Link
        key={equipo.nombre}
        href={`/equipos/${equipo.slug}`}
        className={`bg-gradient-to-br ${colores[index]} p-6 rounded-3xl shadow-xl text-center hover:scale-105 transition`}
      >
        <div className="text-4xl">
          {medallas[index]}
        </div>

        <Image
          src={equipo.logo}
          alt={equipo.nombre}
          width={100}
          height={100}
          className="mx-auto mt-3"
        />

        <h3 className="text-2xl font-black mt-3 text-white">
          {equipo.nombre}
        </h3>

        <p className="text-white font-bold mt-2">
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

    {partidos
      .filter(
        (partido) =>
          partido.puntosLocal === 0 &&
          partido.puntosVisitante === 0
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

<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 items-stretch">

  <Link href={`/jugadores/${lideresPuntos[0].slug}`}>
    <div className="bg-red-100 p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all text-center cursor-pointer h-full">

      <h2 className="text-xl font-bold mb-4">🏀 Líder en Puntos</h2>

      <Image
        src={lideresPuntos[0].foto}
        alt={lideresPuntos[0].nombre}
        width={100}
        height={100}
        className="mx-auto rounded-full"
      />

      <p className="font-bold text-xl mt-4">
        {lideresPuntos[0].nombre}
      </p>

      <p className="text-red-700 text-3xl font-black">
  {lideresPuntos[0].ppg}
</p>

      <p>PPG</p>

    </div>
  </Link>

  <Link href={`/jugadores/${lideresRebotes[0].slug}`}>
    <div className="bg-purple-100 p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all text-center cursor-pointer h-full">

      <h2 className="text-xl font-bold mb-4">💪 Líder en Rebotes</h2>

      <Image
        src={lideresRebotes[0].foto}
        alt={lideresRebotes[0].nombre}
        width={120}
        height={120}
        className="mx-auto rounded-full"
      />

      <p className="font-bold text-xl mt-4">
        {lideresRebotes[0].nombre}
      </p>

      <p className="text-red-700 text-3xl font-black">
        {lideresRebotes[0].rpg}
      </p>

      <p>RPG</p>

    </div>
  </Link>

  <Link href={`/jugadores/${lideresAsistencias[0].slug}`}>
    <div className="bg-yellow-100 p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all text-center cursor-pointer h-full">

      <h2 className="text-xl font-bold mb-4">🎯 Líder en Asistencias</h2>

      <Image
        src={lideresAsistencias[0].foto}
        alt={lideresAsistencias[0].nombre}
        width={120}
        height={120}
        className="mx-auto rounded-full"
      />

      <p className="font-bold text-xl mt-4">
        {lideresAsistencias[0].nombre}
      </p>

      <p className="text-yellow-600 text-3xl font-black">
        {lideresAsistencias[0].apg}
      </p>

      <p>APG</p>

    </div>
  </Link>

</div>
</div> 
</main>

</>
);
}