import Navbar from "../components/Navbar";
import { partidos } from "../../data/partidos";
import { equipos } from "../../data/equipos";
import Image from "next/image";


export default function Resultados() {
  const resultados = partidos.filter(
    (partido) =>
      partido.puntosLocal > 0 ||
      partido.puntosVisitante > 0
  );

  return (
    <>
      <Navbar />
      
    <main className="min-h-screen bg-slate-100 pt-24 p-4 md:p-10">

        <h1 className="text-4xl font-black text-center text-blue-900 mb-10">
          🏆 Resultados LIBAVIME
        </h1>

        <div className="space-y-4">

          {resultados.map((partido, index) => {

  const equipoLocal = equipos.find(
    (e) => e.nombre === partido.local
  );

  const equipoVisitante = equipos.find(
    (e) => e.nombre === partido.visitante
  );

  return (

    <div
      key={index}
      className="bg-white rounded-xl shadow p-6"
    >
              <div className="flex justify-between items-center">

                <div className="text-center flex-1">
  <p
    className={`font-bold text-xl ${
      partido.puntosLocal > partido.puntosVisitante
        ? "text-green-600"
        : ""
    }`}
    
  >
    <Image
  src={equipoLocal?.logo || ""}
  alt={partido.local}
  width={80}
  height={80}
  className="mx-auto mb-2"
/>
    {partido.local}
  </p>
                  <p className="text-4xl font-black text-blue-900">
                    {partido.puntosLocal}
                  </p>
                </div>

                <div className="px-6">
                 <p className="font-black text-2xl text-green-600">
  FINAL
</p>
                </div>

                <div className="text-center flex-1">
  <p
    className={`font-bold text-xl ${
      partido.puntosVisitante > partido.puntosLocal
        ? "text-green-600"
        : ""
    }`}
  >
    <Image
  src={equipoVisitante?.logo || ""}
  alt={partido.local}
  width={80}
  height={80}
  className="mx-auto mb-2"
/>
    {partido.visitante}
  </p>
                  <p className="text-4xl font-black text-red-600">
                    {partido.puntosVisitante}
                  </p>
                </div>

              </div>

              <p className="text-center text-gray-600 mt-4">
                {partido.fecha}
              </p>
            </div>

  );
})}

              </div>
    </main>
  </>
  );
}