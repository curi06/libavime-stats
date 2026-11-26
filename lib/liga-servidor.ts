import { cache } from "react";
import { crearSupabaseServidor } from "@/lib/supabase-server";
import {
  columnasEquipo,
  columnasLiga,
  normalizarEquipos,
  type EquipoLiga,
  type Liga,
  type TemporadaLiga,
} from "@/lib/liga";

/**
 * Carga la liga por su slug y sus equipos, con la sesión del visitante
 * (las políticas RLS deciden si puede verla). Se memoriza por petición,
 * así el layout y la página no consultan dos veces.
 */
export const obtenerLiga = cache(
  async (slug: string): Promise<{ liga: Liga; equipos: EquipoLiga[]; temporadas: TemporadaLiga[] } | null> => {
    const limpio = decodeURIComponent(slug).trim().toLowerCase();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(limpio)) return null;

    const supabase = await crearSupabaseServidor();
    const { data: liga, error } = await supabase
      .from("ligas")
      .select(columnasLiga)
      .eq("slug", limpio)
      .maybeSingle<Liga>();

    if (error) {
      console.error("Error cargando la liga:", error);
      return null;
    }
    if (!liga) return null;

    const [{ data: equipos }, { data: temporadas }] = await Promise.all([
      supabase.from("equipos").select(columnasEquipo).eq("liga_id", liga.id),
      supabase
        .from("admin_temporadas")
        .select("id, nombre, activa, fecha_inicio")
        .eq("liga_id", liga.id)
        .order("id", { ascending: false }),
    ]);

    return {
      liga: { ...liga, configuracion: liga.configuracion ?? {} },
      equipos: normalizarEquipos(equipos, liga),
      temporadas: (temporadas ?? []) as TemporadaLiga[],
    };
  }
);
