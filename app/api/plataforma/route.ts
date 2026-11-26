import { NextResponse } from "next/server";
import { verificarAdminPlataforma } from "@/lib/plataforma-auth";
import { supabaseServicio } from "@/lib/liga-api";
import { LIGA_HISTORICA } from "@/lib/liga";

export const runtime = "nodejs";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ESTADOS = ["activa", "pendiente", "suspendida"];

/** Panel de plataforma: solicitudes y ligas. */
export async function GET() {
  const acceso = await verificarAdminPlataforma();
  if (acceso.respuesta) return acceso.respuesta;

  const servicio = supabaseServicio();
  const [solicitudes, ligas] = await Promise.all([
    servicio.from("solicitudes_liga").select("*").order("creada_en", { ascending: false }).limit(200),
    servicio
      .from("ligas")
      .select("id, slug, nombre, nombre_corto, ciudad, estado, plan, creada_en, logo_url")
      .order("creada_en", { ascending: true }),
  ]);
  if (solicitudes.error || ligas.error) {
    console.error(solicitudes.error ?? ligas.error);
    return NextResponse.json({ error: "No se pudo cargar el panel." }, { status: 500 });
  }
  return NextResponse.json({ solicitudes: solicitudes.data, ligas: ligas.data });
}

/**
 * Acciones:
 *  { accion: "aprobar", solicitud_id, slug }  → crea la liga, su primera
 *     temporada e invita al contacto como administrador.
 *  { accion: "rechazar", solicitud_id }
 *  { accion: "estado", liga_id, estado }      → activar / suspender.
 */
export async function POST(request: Request) {
  const acceso = await verificarAdminPlataforma();
  if (acceso.respuesta) return acceso.respuesta;

  const cuerpo = await request.json().catch(() => ({}));
  const servicio = supabaseServicio();

  try {
    if (cuerpo.accion === "estado") {
      if (!ESTADOS.includes(cuerpo.estado)) {
        return NextResponse.json({ error: "Estado no válido." }, { status: 400 });
      }
      const { data: liga } = await servicio.from("ligas").select("slug").eq("id", cuerpo.liga_id).maybeSingle();
      if (!liga) return NextResponse.json({ error: "La liga no existe." }, { status: 404 });
      if (liga.slug === LIGA_HISTORICA && cuerpo.estado !== "activa") {
        return NextResponse.json({ error: "La liga principal no se puede desactivar desde aquí." }, { status: 409 });
      }
      const { error } = await servicio
        .from("ligas")
        .update({ estado: cuerpo.estado, ...(cuerpo.estado === "activa" ? { aprobada_en: new Date().toISOString() } : {}) })
        .eq("id", cuerpo.liga_id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    const { data: solicitud } = await servicio
      .from("solicitudes_liga")
      .select("*")
      .eq("id", cuerpo.solicitud_id)
      .maybeSingle();
    if (!solicitud) return NextResponse.json({ error: "La solicitud no existe." }, { status: 404 });
    if (solicitud.estado !== "pendiente") {
      return NextResponse.json({ error: "Esta solicitud ya fue revisada." }, { status: 409 });
    }

    if (cuerpo.accion === "rechazar") {
      const { error } = await servicio
        .from("solicitudes_liga")
        .update({ estado: "rechazada", revisada_en: new Date().toISOString() })
        .eq("id", solicitud.id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (cuerpo.accion !== "aprobar") {
      return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
    }

    const slug = String(cuerpo.slug ?? solicitud.slug_deseado ?? "").trim().toLowerCase();
    if (!SLUG.test(slug) || slug.length < 3 || slug.length > 40) {
      return NextResponse.json(
        { error: "La dirección debe tener 3–40 letras minúsculas, números o guiones." },
        { status: 400 }
      );
    }

    // 1. Liga
    const { data: liga, error: errorLiga } = await servicio
      .from("ligas")
      .insert({
        slug,
        nombre: solicitud.nombre_liga,
        ciudad: solicitud.ciudad,
        estado: "activa",
        aprobada_en: new Date().toISOString(),
        configuracion: { temporada: String(new Date().getFullYear()) },
      })
      .select("id, slug")
      .single();
    if (errorLiga) {
      const mensaje = errorLiga.code === "23505"
        ? "Esa dirección ya está en uso."
        : errorLiga.code === "23514"
          ? "Esa dirección está reservada o no es válida."
          : "No se pudo crear la liga.";
      return NextResponse.json({ error: mensaje }, { status: 409 });
    }

    // 2. Primera temporada (los partidos la necesitan)
    await servicio.from("admin_temporadas").insert({
      liga_id: liga.id,
      nombre: `Temporada ${new Date().getFullYear()}`,
      activa: true,
    });

    // 3. Administrador de la liga: el contacto de la solicitud
    const correo = String(solicitud.contacto_correo).toLowerCase();
    const { data: existente } = await servicio.rpc("usuario_por_correo", { p_correo: correo });
    let usuarioId = (existente as string | null) ?? null;
    let avisoInvitacion = "";
    if (!usuarioId) {
      const origen = new URL(request.url).origin;
      const { data, error } = await servicio.auth.admin.inviteUserByEmail(correo, {
        redirectTo: `${origen}/bienvenida?liga=${encodeURIComponent(slug)}`,
        data: { nombre: solicitud.contacto_nombre },
      });
      if (error || !data.user) {
        console.error("Error invitando al administrador:", error);
        avisoInvitacion = "La liga se creó, pero no se pudo enviar la invitación. Invítalo desde Miembros.";
      } else {
        usuarioId = data.user.id;
      }
    }
    if (usuarioId) {
      await servicio.from("miembros_liga").upsert(
        {
          liga_id: liga.id,
          usuario_id: usuarioId,
          rol: "Administrador",
          puede_planilla: true,
          activo: true,
          nombre: solicitud.contacto_nombre,
          correo,
        },
        { onConflict: "liga_id,usuario_id" }
      );
    }

    // 4. Solicitud aprobada
    await servicio
      .from("solicitudes_liga")
      .update({ estado: "aprobada", liga_id: liga.id, revisada_en: new Date().toISOString() })
      .eq("id", solicitud.id);

    return NextResponse.json({ ok: true, liga, aviso: avisoInvitacion || undefined }, { status: 201 });
  } catch (error) {
    console.error("Error en el panel de plataforma:", error);
    return NextResponse.json({ error: "La operación no se pudo completar." }, { status: 500 });
  }
}
