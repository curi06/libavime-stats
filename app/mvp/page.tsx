import Navbar from "../components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { jugadores } from "../../data/jugadores";

export default function MVPPage() {

  const mvp = [...jugadores].sort(
    (a, b) => b.ppg - a.ppg
  )[0];

  return (
  <>
    <Navbar />

    <main className="min-h-screen bg-slate-100 pt-24 p-4 md:p-10">

      <div className="max-w-5xl mx-auto">

        <div className="bg-white rounded-3xl shadow-2xl p-10 text-center">

          <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl py-4 px-6 mb-8">
  <h1 className="text-5xl font-black text-white">
    🏆 MVP LIBAVIME 2026
  </h1>
</div>
          <Image
            src={mvp.foto}
            alt={mvp.nombre}
            width={220}
            height={220}
            className="mx-auto rounded-full border-4 border-white"
          />

          <h2 className="text-4xl font-black mt-6">
            {mvp.nombre}
          </h2>

          <p className="text-2xl mt-2">
            {mvp.equipo}
          </p>

          <div className="grid md:grid-cols-3 gap-6 mt-10 items-stretch">

            <div className="bg-blue-100 rounded-2xl p-6">
  <p className="text-sm">🏀 Puntos</p>
  <p className="text-5xl font-black text-blue-900">
    {mvp.ppg}
  </p>
  <p>PPG</p>
</div>

<div className="bg-green-100 rounded-2xl p-6">
  <p className="text-sm">💪 Rebotes</p>
  <p className="text-5xl font-black text-green-700">
    {mvp.rpg}
  </p>
  <p>RPG</p>
</div>

<div className="bg-red-100 rounded-2xl p-6">
  <p className="text-sm">🎯 Asistencias</p>
  <p className="text-5xl font-black text-red-700">
    {mvp.apg}
  </p>
  <p>APG</p>
</div>
          </div>

          <Link
            href={`/jugadores/${mvp.slug}`}
            className="inline-block mt-10 bg-blue-900 text-white px-8 py-4 rounded-full font-bold hover:bg-blue-800 transition"
          >
            Ver Perfil Completo
          </Link>

        </div>

            </div>

    </main>
  </>
  );
}