import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verificarAdministrador } from "@/lib/admin-auth";
import { ligaDeDiseno, resolverLiga } from "@/lib/liga-api";

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

export async function GET(request: Request) {
  try {
    const ligaRes = await resolverLiga(new URL(request.url).searchParams.get("liga"));
    if (ligaRes.respuesta) return ligaRes.respuesta;
    const supabase = obtenerSupabaseAdmin();

    const { data, error } = await supabase
      .from("libavime_disenos")
      .select("id, titulo, tipo, archivo, url, creado_en, jugador, categoria, jornada")
      .eq("publicado", true)
      .eq("liga_id", ligaRes.liga.id)
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
  const inicio = performance.now();

const medir = (paso: string) => {
  console.log(
    `[LIBAVIME API] ${paso}: ${(
      (performance.now() - inicio) /
      1000
    ).toFixed(2)} s`
  );
};
  let archivoSubido: string | null = null;

  try {
    const body = await request.json();
    const ligaRes = await resolverLiga(body?.liga ?? new URL(request.url).searchParams.get("liga"));
    if (ligaRes.respuesta) return ligaRes.respuesta;
    const liga = ligaRes.liga;

    const acceso = await verificarAdministrador("publicar diseños", liga);
    if (acceso.respuesta) return acceso.respuesta;
    medir("Sesión verificada");


const titulo =
  typeof body.titulo === "string" ? body.titulo.trim() : "";
const tipo = body.tipo;
const imagen = body.imagen;
const publicado = body.publicado !== false;


const jugador =
  typeof body.jugador === "string" ? body.jugador.trim() : null;

const categoriasPermitidas = [
  "jugador",
  "lideres",
  "posiciones",
  "destacados",
];

const categoria =
  typeof body.categoria === "string" &&
  categoriasPermitidas.includes(body.categoria)
    ? body.categoria
    : null;

const jornada =
  typeof body.jornada === "string" && body.jornada.trim()
    ? body.jornada.trim()
    : null;

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
  /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/
);


    
if (!coincidencia) {
  return NextResponse.json(
    { error: "La imagen debe ser un JPEG válido." },
    { status: 400 }
  );
}


    const bytes = Buffer.from(coincidencia[1], "base64");
    medir("Imagen convertida a bytes");

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
archivoSubido = `${liga.id}/${id}.jpg`;

const supabase = obtenerSupabaseAdmin();

const { error: uploadError } = await supabase.storage
  .from(BUCKET)
  .upload(archivoSubido, bytes, {
    contentType: "image/jpeg",
    upsert: false,
  });
  medir("Subida a Supabase Storage terminada");


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
  liga_id: liga.id,
  titulo,
  tipo,
  jugador,
  categoria,
  jornada,
  archivo: archivoSubido,
  url: urlData.publicUrl,
  publicado,
})
      
.select(
  "id, titulo, tipo, archivo, url, creado_en, jugador, categoria, jornada"
)
.single();
medir("Registro en la base de datos terminado");


    if (insertError) {
      console.error("Error registrando diseño:", insertError);

      await supabase.storage.from(BUCKET).remove([archivoSubido]);
      archivoSubido = null;

      return NextResponse.json(
        { error: "La imagen se subió, pero no pudo registrarse en la galería." },
        { status: 500 }
      );
    }
    medir("Proceso completo");

    return NextResponse.json({ diseno: data }, { status: 201 });
  } catch (error) {
    console.error("Error publicando diseño:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al publicar el diseño." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json(
        { error: "El identificador del diseño no es válido." },
        { status: 400 }
      );
    }

    const supabase = obtenerSupabaseAdmin();

    const { data: diseno, error: consultaError } = await supabase
      .from("libavime_disenos")
      .select("id, archivo")
      .eq("id", id)
      .maybeSingle();

    if (consultaError) {
      console.error("Error buscando diseño para eliminar:", consultaError);
      return NextResponse.json(
        { error: "No se pudo localizar el diseño." },
        { status: 500 }
      );
    }

    if (!diseno) {
      return NextResponse.json(
        { error: "La publicación no existe o ya fue eliminada." },
        { status: 404 }
      );
    }

    const ligaDelDiseno = await ligaDeDiseno(id);
    if (!ligaDelDiseno) {
      return NextResponse.json({ error: "No se encontró la liga del diseño." }, { status: 404 });
    }
    const acceso = await verificarAdministrador("eliminar publicaciones", ligaDelDiseno);
    if (acceso.respuesta) return acceso.respuesta;



    const { error: eliminarRegistroError } = await supabase
      .from("libavime_disenos")
      .delete()
      .eq("id", id);

    if (eliminarRegistroError) {
      console.error("Error eliminando registro:", eliminarRegistroError);

      return NextResponse.json(
        { error: "No se pudo eliminar el registro de la publicación." },
        { status: 500 }
      );
    }

    const { error: eliminarArchivoError } = await supabase.storage
      .from(BUCKET)
      .remove([diseno.archivo]);

    if (eliminarArchivoError) {
      console.error(
        "No se pudo eliminar el archivo del almacenamiento:",
        eliminarArchivoError
      );

      return NextResponse.json(
        {
          eliminado: true,
          advertencia:
            "La publicación se eliminó de la galería, pero el archivo podría permanecer almacenado.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ eliminado: true, id });
  } catch (error) {
    console.error("Error en DELETE de diseños:", error);

    return NextResponse.json(
      { error: "Ocurrió un error al eliminar la publicación." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      return NextResponse.json(
        { error: "El identificador del diseño no es válido." },
        { status: 400 }
      );
    }

    const ligaDelDiseno = await ligaDeDiseno(id);
    if (!ligaDelDiseno) {
      return NextResponse.json({ error: "El borrador no existe." }, { status: 404 });
    }
    const acceso = await verificarAdministrador("publicar borradores", ligaDelDiseno);
    if (acceso.respuesta) return acceso.respuesta;

    const supabase = obtenerSupabaseAdmin();

    const { data, error } = await supabase
      .from("libavime_disenos")
      .update({ publicado: true })
      .eq("id", id)
      .eq("publicado", false)
      .select(
        "id, titulo, tipo, archivo, url, creado_en, jugador, categoria, jornada"
      )
      .maybeSingle();

    if (error) {
      console.error("Error publicando borrador:", error);

      return NextResponse.json(
        { error: "No se pudo publicar el borrador." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "El borrador no existe o ya fue publicado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ diseno: data });
  } catch (error) {
    console.error("Error en PATCH de diseños:", error);

    return NextResponse.json(
      { error: "Ocurrió un error al publicar el borrador." },
      { status: 500 }
    );
  }
}
