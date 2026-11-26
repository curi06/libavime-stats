import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { LIGA_HISTORICA } from "@/lib/liga";

/** Cliente con la clave de servidor (ignora RLS): solo para rutas /api. */
export function supabaseServicio() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) throw new Error("Falta configurar Supabase en el servidor.");
  return createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type LigaApi = { id: string; slug: string };

/**
 * Obtiene la liga indicada por la petición (?liga=slug o campo "liga" del
 * cuerpo). Si no se indica, usa LIBAVIME (llamadas antiguas). Devuelve una respuesta de error si la liga no existe.
 */
export async function resolverLiga(
  slug: string | null | undefined
): Promise<{ liga: LigaApi; respuesta?: undefined } | { liga?: undefined; respuesta: NextResponse }> {
  // Las llamadas antiguas sin ?liga= son de LIBAVIME.
  const limpio = String(slug ?? "").trim().toLowerCase() || LIGA_HISTORICA;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(limpio)) {
    return { respuesta: NextResponse.json({ error: "Liga no válida." }, { status: 400 }) };
  }

  const { data, error } = await supabaseServicio()
    .from("ligas")
    .select("id, slug, estado")
    .eq("slug", limpio)
    .maybeSingle();

  if (error) {
    console.error("Error buscando la liga:", error);
    return { respuesta: NextResponse.json({ error: "No se pudo verificar la liga." }, { status: 500 }) };
  }
  if (!data) {
    return { respuesta: NextResponse.json({ error: "La liga no existe." }, { status: 404 }) };
  }
  return { liga: { id: data.id, slug: data.slug } };
}

/** Liga dueña de un diseño (para autorizar borrar/publicar ese diseño). */
export async function ligaDeDiseno(id: string): Promise<LigaApi | null> {
  const { data } = await supabaseServicio()
    .from("libavime_disenos")
    .select("liga_id, ligas(slug)")
    .eq("id", id)
    .maybeSingle<{ liga_id: string; ligas: { slug: string } | null }>();
  return data?.ligas ? { id: data.liga_id, slug: data.ligas.slug } : null;
}
