import type { SupabaseClient } from "@supabase/supabase-js";

export type ResultadoInvitacion =
  | { usuarioId: string; enviado: true; enlace?: undefined; error?: undefined }
  | { usuarioId: string; enviado: false; enlace: string; error?: undefined }
  | { usuarioId?: undefined; enviado: false; enlace?: undefined; error: string };

/**
 * Invita a una persona nueva. Primero intenta enviar el correo de Supabase;
 * si no se puede (sin SMTP propio, límite de envíos, correo no autorizado),
 * genera el enlace de invitación para compartirlo por WhatsApp u otro medio.
 * La persona crea su contraseña en /bienvenida en ambos casos.
 */
export async function invitarUsuario(
  servicio: SupabaseClient,
  correo: string,
  nombre: string,
  redirectTo: string
): Promise<ResultadoInvitacion> {
  const { data, error } = await servicio.auth.admin.inviteUserByEmail(correo, {
    redirectTo,
    data: { nombre },
  });
  if (!error && data.user) return { usuarioId: data.user.id, enviado: true };

  console.warn("No se pudo enviar el correo de invitación; se genera enlace:", error?.message);

  const { data: enlace, error: errorEnlace } = await servicio.auth.admin.generateLink({
    type: "invite",
    email: correo,
    options: { redirectTo, data: { nombre } },
  });
  if (errorEnlace || !enlace.user || !enlace.properties?.action_link) {
    console.error("Tampoco se pudo generar el enlace de invitación:", errorEnlace);
    return { enviado: false, error: errorEnlace?.message ?? error?.message ?? "No se pudo invitar." };
  }
  return { usuarioId: enlace.user.id, enviado: false, enlace: enlace.properties.action_link };
}
