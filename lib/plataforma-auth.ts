import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { crearSupabaseServidor } from "@/lib/supabase-server";

/** Solo la administración de Quinteto Pro (tabla administradores_plataforma). */
export async function verificarAdminPlataforma(): Promise<
  { user: User; respuesta?: undefined } | { user?: undefined; respuesta: NextResponse }
> {
  const supabase = await crearSupabaseServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { respuesta: NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 }) };
  }
  const { data: esAdmin } = await supabase.rpc("es_admin_plataforma");
  if (esAdmin !== true) {
    return { respuesta: NextResponse.json({ error: "Solo para la administración de la plataforma." }, { status: 403 }) };
  }
  return { user };
}
