import { NextResponse } from "next/server";
import { supabaseServicio } from "@/lib/liga-api";

export const runtime = "nodejs";

const CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const texto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** Formulario público: una liga solicita su cuenta en Quinteto Pro. */
export async function POST(request: Request) {
  try {
    const cuerpo = await request.json().catch(() => ({}));

    // Campo trampa: las personas no lo ven; los robots suelen llenarlo.
    if (texto(cuerpo.sitio_web, 200)) {
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const solicitud = {
      nombre_liga: texto(cuerpo.nombre_liga, 120),
      slug_deseado: texto(cuerpo.slug_deseado, 40).toLowerCase().replace(/[^a-z0-9-]/g, "") || null,
      ciudad: texto(cuerpo.ciudad, 80) || null,
      contacto_nombre: texto(cuerpo.contacto_nombre, 120),
      contacto_correo: texto(cuerpo.contacto_correo, 200).toLowerCase(),
      contacto_telefono: texto(cuerpo.contacto_telefono, 30) || null,
      mensaje: texto(cuerpo.mensaje, 1000) || null,
    };

    if (solicitud.nombre_liga.length < 3) {
      return NextResponse.json({ error: "Escribe el nombre de la liga." }, { status: 400 });
    }
    if (solicitud.contacto_nombre.length < 2) {
      return NextResponse.json({ error: "Escribe tu nombre." }, { status: 400 });
    }
    if (!CORREO.test(solicitud.contacto_correo)) {
      return NextResponse.json({ error: "El correo no es válido." }, { status: 400 });
    }

    const servicio = supabaseServicio();

    // Límite simple contra abuso: máximo 3 solicitudes pendientes por correo.
    const { count } = await servicio
      .from("solicitudes_liga")
      .select("id", { count: "exact", head: true })
      .eq("contacto_correo", solicitud.contacto_correo)
      .eq("estado", "pendiente");
    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Ya recibimos tus solicitudes. Te contactaremos pronto." },
        { status: 429 }
      );
    }

    const { error } = await servicio.from("solicitudes_liga").insert(solicitud);
    if (error) throw error;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Error registrando solicitud:", error);
    return NextResponse.json({ error: "No se pudo enviar la solicitud." }, { status: 500 });
  }
}
