"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLiga } from "@/app/components/LigaContext";

type Paso = { listo: boolean; titulo: string; detalle: string; ruta: string };

/**
 * Lista de primeros pasos para una liga nueva. Se oculta sola cuando
 * todo está configurado.
 */
export default function PrimerosPasos() {
  const { liga, equipos, ruta } = useLiga();
  const [conteo, setConteo] = useState<{ jugadores: number; partidos: number; miembros: number; esAdmin: boolean } | null>(null);

  useEffect(() => {
    let activo = true;
    const contar = (tabla: string) =>
      supabase.from(tabla).select("*", { count: "exact", head: true }).eq("liga_id", liga.id);
    void Promise.all([
      contar("jugadores"),
      contar("partidos"),
      contar("miembros_liga"),
      supabase.rpc("mi_rol_en_liga", { p_liga: liga.id }),
    ]).then(([j, p, m, rol]) => {
      if (activo) {
        setConteo({
          jugadores: j.count ?? 0,
          partidos: p.count ?? 0,
          miembros: m.count ?? 0,
          esAdmin: rol.data === "Administrador",
        });
      }
    });
    return () => {
      activo = false;
    };
  }, [liga.id]);

  // Solo para administradores: los pasos enlazan a pantallas de administración.
  if (!conteo || !conteo.esAdmin) return null;

  const pasos: Paso[] = [
    {
      listo: Boolean(liga.logo_url),
      titulo: "Personaliza tu liga",
      detalle: "Sube el logo y elige los colores.",
      ruta: "/admin/configuracion",
    },
    {
      listo: equipos.length >= 2,
      titulo: "Registra los equipos",
      detalle: `${equipos.length} registrados (mínimo 2).`,
      ruta: "/admin/equipos",
    },
    {
      listo: conteo.jugadores > 0,
      titulo: "Agrega jugadores",
      detalle: `${conteo.jugadores} registrados.`,
      ruta: "/admin/jugadores",
    },
    {
      listo: conteo.partidos > 0,
      titulo: "Programa los partidos",
      detalle: `${conteo.partidos} en el calendario.`,
      ruta: "/admin/partidos",
    },
    {
      listo: conteo.miembros > 1,
      titulo: "Invita a tu equipo de planilla",
      detalle: "Quien anota las estadísticas en vivo.",
      ruta: "/admin/miembros",
    },
  ];

  const completados = pasos.filter((p) => p.listo).length;
  if (completados === pasos.length) return null;

  return (
    <section className="mb-8 rounded-3xl border-2 border-orange-200 bg-orange-50 p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-black text-slate-900">🚀 Primeros pasos</h2>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-orange-700">
          {completados} de {pasos.length}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-orange-100">
        <div className="h-full bg-orange-500 transition-all" style={{ width: `${(completados / pasos.length) * 100}%` }} />
      </div>
      <ol className="mt-4 space-y-2">
        {pasos.map((paso, i) => (
          <li key={paso.titulo}>
            <Link
              href={ruta(paso.ruta)}
              className={`flex items-center gap-3 rounded-2xl bg-white p-3 transition hover:shadow ${paso.listo ? "opacity-60" : ""}`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-black ${paso.listo ? "bg-green-500 text-white" : "bg-orange-100 text-orange-700"}`}>
                {paso.listo ? "✓" : i + 1}
              </span>
              <span>
                <span className={`block font-black ${paso.listo ? "text-slate-500 line-through" : "text-slate-900"}`}>{paso.titulo}</span>
                <span className="text-sm text-slate-600">{paso.detalle}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
