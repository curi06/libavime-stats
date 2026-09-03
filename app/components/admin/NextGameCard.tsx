type Partido = {
  equipo_local: string;
  equipo_visitante: string;
  fecha: string;
  hora: string;
  cancha: string;
};

type Props = {
  proximoPartido: Partido | null;
};

export default function NextGameCard({
  proximoPartido,
}: Props) {
  return (
    <div className="mt-10">
      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">

        <h2 className="text-2xl font-bold mb-8 text-center">
          🏆 Próximo Partido
        </h2>

        {proximoPartido ? (
          <>
            {/* EQUIPOS Y VS */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">

              {/* EQUIPO LOCAL */}
              <h3 className="flex-1 text-3xl md:text-4xl font-black text-center text-blue-900">
                {proximoPartido.equipo_local}
              </h3>

              {/* VS DESTACADO */}
              <div className="flex items-center justify-center">
                <span className="inline-flex items-center justify-center bg-red-600 text-white text-3xl md:text-5xl font-black italic px-6 py-4 md:px-8 md:py-5 rounded-2xl shadow-xl border-4 border-red-200 -skew-x-6">
                  VS
                </span>
              </div>

              {/* EQUIPO VISITANTE */}
              <h3 className="flex-1 text-3xl md:text-4xl font-black text-center text-blue-900">
                {proximoPartido.equipo_visitante}
              </h3>

            </div>

            {/* INFORMACIÓN DEL PARTIDO */}
            <div className="mt-8 pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-gray-600 font-semibold">

              <p>
                📅 {proximoPartido.fecha}
              </p>

              <p>
                🕒 {proximoPartido.hora}
              </p>

              <p>
                📍 {proximoPartido.cancha}
              </p>

            </div>
          </>
        ) : (
          <p className="text-center text-gray-500">
            No hay partidos programados.
          </p>
        )}

      </div>
    </div>
  );
}