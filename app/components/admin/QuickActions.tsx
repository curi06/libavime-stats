import Link from "next/link";

export default function QuickActions() {
  return (
    <>
      <h2 className="text-3xl font-bold mt-12 mb-6">
        Administración
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <Link
          href="/admin/jugadores"
          className="bg-white rounded-2xl shadow-lg p-8 text-center hover:scale-105 transition"
        >
          <h2 className="text-3xl font-black mb-3">
            👤 Jugadores
          </h2>

          <p className="text-gray-600">
            Crear, editar y eliminar jugadores.
          </p>
        </Link>

        <Link
          href="/admin/equipos"
          className="bg-white rounded-2xl shadow-lg p-8 text-center hover:scale-105 transition"
        >
          <h2 className="text-3xl font-black mb-3">
            🏀 Equipos
          </h2>

          <p className="text-gray-600">
            Administrar equipos y logos.
          </p>
        </Link>

        <Link
          href="/admin/partidos"
          className="bg-white rounded-2xl shadow-lg p-8 text-center hover:scale-105 transition"
        >
          <h2 className="text-3xl font-black mb-3">
            📅 Partidos
          </h2>

          <p className="text-gray-600">
            Crear calendario y resultados.
          </p>
        </Link>

      </div>
    </>
  );
}