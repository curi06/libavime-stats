      </div>

    </main>
  );
}
import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">

      <div className="max-w-6xl mx-auto">

        <h1 className="text-4xl md:text-5xl font-black text-center text-blue-900 mb-10">
          ⚙️ Panel de Administración LIBAVIME
        </h1>

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

      </div>

    </main>
  );
}
      </div>

    </main>
  );
}

