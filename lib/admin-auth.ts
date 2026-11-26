import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { crearSupabaseServidor } from "@/lib/supabase-server";

type ResultadoVerificacion =
  | { user: User; respuesta?: undefined }
  | { user?: undefined; respuesta: NextResponse };

/**
 * Verifica que la petición venga de una cuenta administradora de LIBAVIME.
 * "Tener sesión" no basta para autorizar escrituras.
 */
export async function verificarAdministrador(
  accion = "realizar esta acción"
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

  // Rol 'Administrador' activo en admin_usuarios (misma regla que las
  // políticas RLS). LIBAVIME_ADMIN_EMAIL queda como respaldo.
  const { data: esAdministrador } = await supabaseAuth.rpc(
    "es_administrador"
  );

  const correoAdministrador = process.env.LIBAVIME_ADMIN_EMAIL
    ?.trim()
    .toLowerCase();
  const correoUsuario = user.email?.trim().toLowerCase();
  const esCorreoAdministrador =
    Boolean(correoAdministrador) && correoUsuario === correoAdministrador;

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
