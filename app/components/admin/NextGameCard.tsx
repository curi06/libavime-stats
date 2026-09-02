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
      <div className="bg-white rounded-2xl shadow-lg p-8">

        <h2 className="text-2xl font-bold mb-6">
          🏆 Próximo Partido
        </h2>

        {proximoPartido ? (
          <>
            <h3 className="text-3xl font-black text-center">
              {proximoPartido.equipo_local}
            </h3>

            <p className="text-center text-2xl my-4">
              🆚
            </p>

            <h3 className="text-3xl font-black text-center">
              {proximoPartido.equipo_visitante}
            </h3>

            <div className="mt-6 text-center text-gray-600">
              <p>📅 {proximoPartido.fecha}</p>
              <p>🕒 {proximoPartido.hora}</p>
              <p>📍 {proximoPartido.cancha}</p>
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