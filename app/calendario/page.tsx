import Navbar from "../components/Navbar";
import { partidos } from "../../data/partidos";

export default function Calendario() {

  const proximosPartidos = partidos.filter(
    (partido) =>
      partido.puntosLocal === 0 &&
      partido.puntosVisitante === 0
  );

  return (
  <>
    <Navbar />

    <main className="min-h-screen bg-slate-100 pt-24 p-4 md:p-10">
      <div className="max-w-5xl mx-auto">


        <h1 className="text-4xl font-black text-center text-blue-900 mb-10">
          📅 Calendario LIBAVIME
        </h1>

        <div className="space-y-4">
          {proximosPartidos.map((partido, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl shadow"
            >
              <h2 className="text-xl font-bold">
                {partido.local} vs {partido.visitante}
              </h2>

              <p className="text-gray-600">
                {partido.fecha}
              </p>

              <p className="mt-2 font-semibold">
                {partido.puntosLocal > 0 ||
                partido.puntosVisitante > 0
                  ? `${partido.puntosLocal} - ${partido.puntosVisitante}`
                  : "Pendiente"}
              </p>
            </div>
          ))}
        </div>

           </div>
    </main>
  </>
  );
}