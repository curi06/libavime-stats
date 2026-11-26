import { NextResponse } from "next/server";
import { verificarAdministrador } from "@/lib/admin-auth";
import { resolverLiga, supabaseServicio, type LigaApi } from "@/lib/liga-api";

export const runtime = "nodejs";

const ROLES = ["Administrador", "Planilla", "Consulta"] as const;
type Rol = (typeof ROLES)[number];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function prepararLiga(request: Request, cuerpo?: { liga?: unknown }, accion = "administrar miembros") {
  const slug = (typeof cuerpo?.liga === "string" ? cuerpo.liga : null) ??
    new URL(request.url).searchParams.get("liga");
  const ligaRes = await resolverLiga(slug);
  if (ligaRes.respuesta) return { respuesta: ligaRes.respuesta };
  const acceso = await verificarAdministrador(accion, ligaRes.liga);
  if (acceso.respuesta) return { respuesta: acceso.respuesta };
  return { liga: ligaRes.liga, usuario: acceso.user };
}

/** ¿Quedaría la liga sin ningún administrador activo? */
async function quedariaSinAdministrador(liga: LigaApi, usuarioId: string) {
  const { data } = await supabaseServicio()
    .from("miembros_liga")
    .select("usuario_id")
    .eq("liga_id", liga.id)
    .eq("rol", "Administrador")
    .eq("activo", true);
  const otros = (data ?? []).filter((m) => m.usuario_id !== usuarioId);
  return otros.length === 0;
}

export async function GET(request: Request) {
  try {
    const p = await prepararLiga(request, undefined, "ver los miembros");
    if (p.respuesta) return p.respuesta;

    const { data, error } = await supabaseServicio()
      .from("miembros_liga")
      .select("usuario_id, nombre, correo, rol, puede_planilla, activo, creado_en")
      .eq("liga_id", p.liga.id)
      .order("creado_en", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ miembros: data ?? [], yo: p.usuario.id });
  } catch (error) {
    console.error("Error listando miembros:", error);
    return NextResponse.json({ error: "No se pudieron cargar los miembros." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cuerpo = await request.json().catch(() => ({}));
    const p = await prepararLiga(request, cuerpo, "invitar miembros");
    if (p.respuesta) return p.respuesta;

    const correo = String(cuerpo.correo ?? "").trim().toLowerCase();
    const nombre = String(cuerpo.nombre ?? "").trim().slice(0, 120);
    const rol: Rol = ROLES.includes(cuerpo.rol) ? cuerpo.rol : "Consulta";
    const puedePlanilla = rol !== "Consulta" || cuerpo.puede_planilla === true;

    if (!CORREO.test(correo) || correo.length > 200) {
      return NextResponse.json({ error: "El correo no es válido." }, { status: 400 });
    }
    if (nombre.length < 2) {
      return NextResponse.json({ error: "Escribe el nombre de la persona." }, { status: 400 });
    }

    const servicio = supabaseServicio();
    const { data: existente } = await servicio.rpc("usuario_por_correo", { p_correo: correo });
    let usuarioId = (existente as string | null) ?? null;
    let invitado = false;

    if (!usuarioId) {
      const origen = new URL(request.url).origin;
      const { data, error } = await servicio.auth.admin.inviteUserByEmail(correo, {
        redirectTo: `${origen}/bienvenida?liga=${encodeURIComponent(p.liga.slug)}`,
        data: { nombre },
      });
      if (error || !data.user) {
        console.error("Error invitando usuario:", error);
        return NextResponse.json(
          { error: `No se pudo enviar la invitación${error?.message ? `: ${error.message}` : "."}` },
          { status: 502 }
        );
      }
      usuarioId = data.user.id;
      invitado = true;
    }

    const { error: errorMiembro } = await servicio.from("miembros_liga").upsert(
      {
        liga_id: p.liga.id,
        usuario_id: usuarioId,
        rol,
        puede_planilla: puedePlanilla,
        activo: true,
        nombre,
        correo,
      },
      { onConflict: "liga_id,usuario_id" }
    );
    if (errorMiembro) throw errorMiembro;

    return NextResponse.json({ ok: true, invitado }, { status: 201 });
  } catch (error) {
    console.error("Error agregando miembro:", error);
    return NextResponse.json({ error: "No se pudo agregar el miembro." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const cuerpo = await request.json().catch(() => ({}));
    const p = await prepararLiga(request, cuerpo, "cambiar roles");
    if (p.respuesta) return p.respuesta;

    const usuarioId = String(cuerpo.usuario_id ?? "");
    if (!UUID.test(usuarioId)) {
      return NextResponse.json({ error: "Miembro no válido." }, { status: 400 });
    }

    const cambios: Record<string, unknown> = {};
    if (cuerpo.rol !== undefined) {
      if (!ROLES.includes(cuerpo.rol)) return NextResponse.json({ error: "Rol no válido." }, { status: 400 });
      cambios.rol = cuerpo.rol;
    }
    if (typeof cuerpo.puede_planilla === "boolean") cambios.puede_planilla = cuerpo.puede_planilla;
    if (typeof cuerpo.activo === "boolean") cambios.activo = cuerpo.activo;
    if (Object.keys(cambios).length === 0) {
      return NextResponse.json({ error: "No hay cambios." }, { status: 400 });
    }

    const dejaDeSerAdmin =
      (cambios.rol !== undefined && cambios.rol !== "Administrador") || cambios.activo === false;
    if (dejaDeSerAdmin && (await quedariaSinAdministrador(p.liga, usuarioId))) {
      return NextResponse.json(
        { error: "La liga debe tener al menos un administrador activo." },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseServicio()
      .from("miembros_liga")
      .update(cambios)
      .eq("liga_id", p.liga.id)
      .eq("usuario_id", usuarioId)
      .select("usuario_id");
    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: "El miembro no existe." }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error actualizando miembro:", error);
    return NextResponse.json({ error: "No se pudo actualizar el miembro." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const p = await prepararLiga(request, undefined, "quitar miembros");
    if (p.respuesta) return p.respuesta;

    const usuarioId = new URL(request.url).searchParams.get("usuario") ?? "";
    if (!UUID.test(usuarioId)) {
      return NextResponse.json({ error: "Miembro no válido." }, { status: 400 });
    }
    if (await quedariaSinAdministrador(p.liga, usuarioId)) {
      return NextResponse.json(
        { error: "No puedes quitar al último administrador de la liga." },
        { status: 409 }
      );
    }

    const { error } = await supabaseServicio()
      .from("miembros_liga")
      .delete()
      .eq("liga_id", p.liga.id)
      .eq("usuario_id", usuarioId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error quitando miembro:", error);
    return NextResponse.json({ error: "No se pudo quitar el miembro." }, { status: 500 });
  }
}
