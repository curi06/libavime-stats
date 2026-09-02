type Partido = {
  id: number;
  equipo_local: string;
  equipo_visitante: string;
  puntos_local: number;
  puntos_visitante: number;
  fecha: string;
};

type Props = {
  partidos: Partido[];
};

export default function LatestResults({ partidos }: Props) {
  return (
    <div className="mt-12">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6">
          📊 Últimos Resultados
        </h2>

        {partidos.length === 0 ? (
          <p className="text-gray-500">
            No hay resultados registrados.
          </p>
        ) : (
          <div className="space-y-4">
            {partidos.map((partido) => (
              <div
                key={partido.id}
                className="flex justify-between items-center border-b pb-3"
              >
                <div>
                  <p className="font-bold">
                    {partido.equipo_local}
                  </p>

                  <p className="text-sm text-gray-500">
                    vs {partido.equipo_visitante}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xl font-black">
                    {partido.puntos_local} - {partido.puntos_visitante}
                  </p>

                  <p className="text-sm text-gray-500">
                    {partido.fecha}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}