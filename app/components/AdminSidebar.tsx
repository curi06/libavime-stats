"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLiga } from "@/app/components/LigaContext";

type Enlace = { ruta: string; texto: string; destacado?: boolean; soloAdmin?: boolean; externo?: boolean };

const ENLACES: Enlace[] = [
  { ruta: "/admin", texto: "📊 Inicio del panel" },
  { ruta: "/admin/jugadores", texto: "👤 Jugadores" },
  { ruta: "/admin/equipos", texto: "🛡 Equipos" },
  { ruta: "/admin/partidos", texto: "📅 Partidos" },
  { ruta: "/admin/estadisticas", texto: "📈 Estadísticas", destacado: true },
  { ruta: "/planilla", texto: "📝 Planilla en vivo" },
  { ruta: "/admin/instagram", texto: "🎨 Editor de Instagram" },
  { ruta: "/admin/miembros", texto: "👥 Miembros", soloAdmin: true },
  { ruta: "/admin/temporadas", texto: "🗓️ Temporadas", soloAdmin: true },
  { ruta: "/admin/configuracion", texto: "⚙️ Configuración de la liga", soloAdmin: true },
  { ruta: "/", texto: "🌐 Ver página pública", externo: true },
];

/**
 * Navegación del panel de cada liga: barra lateral en computadora y, en el
 * celular, una barra superior con botón ☰ que abre el menú completo.
 */
export default function AdminSidebar({
  esAdministrador = false,
}: {
  esAdministrador?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { ruta, nombre, logo } = useLiga();
  const [abierto, setAbierto] = useState(false);

  // Cierra el menú del celular al cambiar de página.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con la navegación
    setAbierto(false);
  }, [pathname]);

  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    await supabase.auth.signOut();
    router.push(`/login?next=${encodeURIComponent(ruta("/admin"))}`);
    router.refresh();
  }

  const visibles = ENLACES.filter((e) => !e.soloAdmin || esAdministrador);
  const activo = (e: Enlace) => {
    if (e.externo) return false; // la página pública no es una sección del panel
    const destino = ruta(e.ruta).split("?")[0];
    return e.ruta === "/admin" ? pathname === destino : pathname.startsWith(destino);
  };

  const lista = (
    <nav className="flex flex-col gap-2">
      {visibles.map((e) => (
        <Link
          key={e.ruta}
          href={ruta(e.ruta)}
          target={e.externo ? "_blank" : undefined}
          className={`rounded-xl p-3 transition ${
            activo(e) ? "bg-white font-black text-blue-900" : e.destacado ? "bg-green-600 font-bold hover:bg-green-700" : "hover:bg-blue-800"
          }`}
        >
          {e.texto}
        </Link>
      ))}
      <button
        type="button"
        onClick={() => void cerrarSesion()}
        className="mt-4 rounded-xl border border-white/30 p-3 text-left font-bold hover:bg-blue-800"
      >
        🚪 Cerrar sesión
      </button>
    </nav>
  );

  return (
    <>
      {/* Computadora: barra lateral */}
      <aside className="hidden w-64 shrink-0 bg-blue-900 px-6 pb-6 pt-10 text-white md:block md:min-h-screen">
        <h1 className="mb-8 flex items-center gap-3 text-2xl font-black">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo de la liga */}
          <img src={logo} alt="" className="h-10 w-10 object-contain" />
          {nombre}
        </h1>
        {lista}
      </aside>

      {/* Celular: barra superior fija + menú desplegable */}
      <div className="md:hidden">
        <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-blue-900 px-4 py-3 text-white shadow-lg">
          <Link href={ruta("/admin")} className="flex items-center gap-2 font-black">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo de la liga */}
            <img src={logo} alt="" className="h-8 w-8 object-contain" />
            <span className="max-w-[60vw] truncate">{nombre}</span>
          </Link>
          <button
            type="button"
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={abierto}
            onClick={() => setAbierto((v) => !v)}
            className="rounded-xl bg-white/10 px-3 py-2 text-2xl leading-none"
          >
            {abierto ? "✕" : "☰"}
          </button>
        </header>
        {/* Espacio para que la barra fija no tape el contenido */}
        <div className="h-14" aria-hidden />
        {abierto && (
          <div className="fixed inset-x-0 bottom-0 top-14 z-30 overflow-y-auto bg-blue-950/95 p-4 text-white backdrop-blur">
            {lista}
          </div>
        )}
      </div>
    </>
  );
}
