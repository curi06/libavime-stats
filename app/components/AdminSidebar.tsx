"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminSidebar() {
  const router = useRouter();

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-64 min-h-screen bg-blue-900 text-white p-6">

      <h1 className="text-2xl font-black mb-10">
        🏀 LIBAVIME
      </h1>

      <nav className="flex flex-col gap-3">

        <Link
          href="/admin"
          className="hover:bg-blue-800 rounded-xl p-3"
        >
          📊 Dashboard
        </Link>

        <Link
          href="/admin/jugadores"
          className="hover:bg-blue-800 rounded-xl p-3"
        >
          👤 Jugadores
        </Link>

        <Link
          href="/admin/equipos"
          className="hover:bg-blue-800 rounded-xl p-3"
        >
          🛡 Equipos
        </Link>

        <Link
          href="/admin/partidos"
          className="hover:bg-blue-800 rounded-xl p-3"
        >
          📅 Partidos
        </Link>

      </nav>

    </aside>
  );
}