import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { crearSupabaseServidor } from "@/lib/supabase-server";

type ResultadoVerificacion =
  | { user: User; respuesta?: undefined }
  | { user?: undefined; respuesta: NextResponse };

/**
 * Verifica que la petición venga de la cuenta administradora de LIBAVIME
 * (LIBAVIME_ADMIN_EMAIL). Como el registro público de Supabase está
 * habilitado, "tener sesión" no basta para autorizar escrituras.
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

  const correoAdministrador = process.env.LIBAVIME_ADMIN_EMAIL
    ?.trim()
    .toLowerCase();
  const correoUsuario = user.email?.trim().toLowerCase();

  if (
    !correoAdministrador ||
    !correoUsuario ||
    correoUsuario !== correoAdministrador
  ) {
    return {
      respuesta: NextResponse.json(
        { error: `No tienes permiso para ${accion}.` },
        { status: 403 }
      ),
    };
  }

  return { user };
}
