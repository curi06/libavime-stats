
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const BUCKET = "libavime-disenos";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function obtenerSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Falta configurar Supabase en el servidor.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Falta el identificador del diseño." },
        { status: 400 }
      );
    }

    const supabase = obtenerSupabaseAdmin();

    const { data: diseno, error: consultaError } = await supabase
      .from("libavime_disenos")
      .select("id, titulo, archivo")
      .eq("id", id)
      .eq("publicado", true)
      .maybeSingle();

    if (consultaError) {
      console.error("Error buscando diseño:", consultaError);
      return NextResponse.json(
        { error: "No se pudo localizar el diseño." },
        { status: 500 }
      );
    }

    if (!diseno?.archivo) {
      return NextResponse.json(
        { error: "El diseño no existe o no está publicado." },
        { status: 404 }
      );
    }

    const { data: imagen, error: descargaError } = await supabase.storage
      .from(BUCKET)
      .download(diseno.archivo);

    if (descargaError || !imagen) {
      console.error("Error descargando imagen:", descargaError);
      return NextResponse.json(
        { error: "No se pudo descargar la imagen." },
        { status: 500 }
      );
    }

    const nombreArchivo =
      (diseno.titulo || "libavime")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9-_ ]/g, "")
        .trim()
        .replace(/\s+/g, "-") || "libavime";

    return new NextResponse(imagen, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${nombreArchivo}.jpg"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error en la ruta de descarga:", error);

    return NextResponse.json(
      { error: "Ocurrió un error al descargar el diseño." },
      { status: 500 }
    );
  }
}
