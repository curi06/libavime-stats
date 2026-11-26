"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLiga } from "@/app/components/LigaContext";

export default function AdminSidebar({
  esAdministrador = false,
}: {
  esAdministrador?: boolean;
}) {
  const router = useRouter();
  const { ruta, nombre } = useLiga();


  async function cerrarSesion() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    await supabase.auth.signOut();
    router.push(`/login?next=${encodeURIComponent(ruta("/admin"))}`);
    router.refresh();
  }


  return (
    <aside className="hidden md:block w-64 shrink-0 min-h-screen bg-blue-900 text-white pt-28 px-6 pb-6">

      <h1 className="text-2xl font-black mb-10">
        🏀 {nombre}
      </h1>

      <nav className="flex flex-col gap-3">

        <Link
          href={ruta("/admin")}
          className="hover:bg-blue-800 rounded-xl p-3 transition"
        >
          📊 Dashboard
        </Link>

        <Link
          href={ruta("/admin/jugadores")}
          className="hover:bg-blue-800 rounded-xl p-3 transition"
        >
          👤 Jugadores
        </Link>

        <Link
          href={ruta("/admin/equipos")}
          className="hover:bg-blue-800 rounded-xl p-3 transition"
        >
          🛡 Equipos
        </Link>

        <Link
          href={ruta("/admin/partidos")}
          className="hover:bg-blue-800 rounded-xl p-3 transition"
        >
          📅 Partidos
        </Link>

        <Link
          href={ruta("/admin/estadisticas")}
          className="bg-green-600 hover:bg-green-700 rounded-xl p-3 transition font-bold"
        >
          📊 Estadísticas
        </Link>

        {esAdministrador && (
          <>
            <Link
              href={ruta("/admin/miembros")}
              className="hover:bg-blue-800 rounded-xl p-3 transition"
            >
              👥 Miembros
            </Link>

            <Link
              href={ruta("/admin/temporadas")}
              className="hover:bg-blue-800 rounded-xl p-3 transition"
            >
              🗓️ Temporadas
            </Link>

            <Link
              href={ruta("/admin/configuracion")}
              className="hover:bg-blue-800 rounded-xl p-3 transition"
            >
              ⚙️ Configuración de la liga
            </Link>
          </>
        )}

      </nav>

    </aside>
  );
}