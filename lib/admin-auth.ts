import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { crearSupabaseServidor } from "@/lib/supabase-server";
import { LIGA_HISTORICA } from "@/lib/liga";
import type { LigaApi } from "@/lib/liga-api";

type ResultadoVerificacion =
  | { user: User; respuesta?: undefined }
  | { user?: undefined; respuesta: NextResponse };

/**
 * Verifica que la petición venga de una cuenta administradora de la liga
 * indicada (o de la plataforma). "Tener sesión" no basta para escribir.
 */
export async function verificarAdministrador(
  accion: string,
  liga: LigaApi
): Promise<ResultadoVerificacion> {
  const supabaseAuth = await crearSupabaseServidor();
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();

  if (authError || !user) {
    return {
      respuesta: NextResponse.json(
        { error: `Debes iniciar sesión para ${accion}.` },
        { status: 401 }
      ),
    };
  }

  // Misma regla que las políticas RLS: administrador activo de esa liga
  // o administradora de la plataforma.
  const { data: esAdministrador } = await supabaseAuth.rpc("es_admin_liga", {
    p_liga: liga.id,
  });

  // Respaldo histórico solo para la liga principal (LIBAVIME).
  const correoAdministrador = process.env.LIBAVIME_ADMIN_EMAIL?.trim().toLowerCase();
  const esCorreoAdministrador =
    liga.slug === LIGA_HISTORICA &&
    Boolean(correoAdministrador) &&
    user.email?.trim().toLowerCase() === correoAdministrador;

  if (esAdministrador !== true && !esCorreoAdministrador) {
    return {
      respuesta: NextResponse.json(
        { error: `No tienes permiso para ${accion}.` },
        { status: 403 }
      ),
    };
  }

  return { user };
}
