import Navbar from "../components/Navbar";
import Link from "next/link";
import { equipos } from "../../data/equipos";
import { partidos } from "../../data/partidos";
import Image from "next/image";

export default function Equipos() {
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
      Récord: {equipo.ganados}-{equipo.perdidos}
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