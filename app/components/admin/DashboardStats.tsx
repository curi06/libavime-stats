type Props = {
  totalJugadores: number;
  totalEquipos: number;
  totalPartidos: number;
};

export default function DashboardStats({
  totalJugadores,
  totalEquipos,
  totalPartidos,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <p className="text-gray-500 text-lg">
          👤 Jugadores
        </p>

        <h2 className="text-5xl font-black text-blue-900 mt-2">
          {totalJugadores}
        </h2>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <p className="text-gray-500 text-lg">
          🛡 Equipos
        </p>

        <h2 className="text-5xl font-black text-green-700 mt-2">
          {totalEquipos}
        </h2>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <p className="text-gray-500 text-lg">
          📅 Partidos
        </p>

        <h2 className="text-5xl font-black text-orange-600 mt-2">
          {totalPartidos}
        </h2>
      </div>

    </div>
  );
}