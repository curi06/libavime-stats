import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { crearSupabaseServidor } from "@/lib/supabase-server";

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

export async function GET() {
  try {
    const supabase = obtenerSupabaseAdmin();

    const { data, error } = await supabase
      .from("libavime_disenos")
      .select("id, titulo, tipo, archivo, url, creado_en")
      .eq("publicado", true)
      .order("creado_en", { ascending: false });

    if (error) {
      console.error("Error consultando diseños:", error);
      return NextResponse.json(
        { error: "No se pudieron cargar los diseños." },
        { status: 500 }
      );
    }

    return NextResponse.json({ disenos: data ?? [] });
  } catch (error) {
    console.error("Error en GET de diseños:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los diseños." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let archivoSubido: string | null = null;

  try {
    const supabaseAuth = await crearSupabaseServidor();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para publicar diseños." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const titulo =
      typeof body.titulo === "string" ? body.titulo.trim() : "";
    const tipo = body.tipo;
    const imagen = body.imagen;

    if (
      !titulo ||
      titulo.length > 120 ||
      !["post", "historia"].includes(tipo) ||
      typeof imagen !== "string"
    ) {
      return NextResponse.json(
        { error: "Los datos del diseño no son válidos." },
        { status: 400 }
      );
    }

    const coincidencia = imagen.match(
      /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/
    );

    if (!coincidencia) {
      return NextResponse.json(
        { error: "La imagen debe ser un PNG válido." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(coincidencia[1], "base64");

    if (
      bytes.length === 0 ||
      bytes.length > 10 * 1024 * 1024
    ) {
      return NextResponse.json(
        { error: "La imagen debe pesar menos de 10 MB." },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    archivoSubido = `${id}.png`;

    const supabase = obtenerSupabaseAdmin();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(archivoSubido, bytes, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error subiendo diseño:", uploadError);
      return NextResponse.json(
        { error: "No se pudo subir la imagen al almacenamiento." },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(archivoSubido);

    const { data, error: insertError } = await supabase
      .from("libavime_disenos")
      .insert({
        titulo,
        tipo,
        archivo: archivoSubido,
        url: urlData.publicUrl,
        publicado: true,
      })
      .select("id, titulo, tipo, archivo, url, creado_en")
      .single();

    if (insertError) {
      console.error("Error registrando diseño:", insertError);

      await supabase.storage.from(BUCKET).remove([archivoSubido]);
      archivoSubido = null;

      return NextResponse.json(
        { error: "La imagen se subió, pero no pudo registrarse en la galería." },
        { status: 500 }
      );
    }

    return NextResponse.json({ diseno: data }, { status: 201 });
  } catch (error) {
    console.error("Error publicando diseño:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al publicar el diseño." },
      { status: 500 }
    );
  }
}
