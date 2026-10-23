
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { crearSupabaseServidor } from "@/lib/supabase-server";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CLAVE = "encuadres_jugadores";

function obtenerSupabaseServidor() {
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

const archivo = path.join(
  process.cwd(),
  "data",
  "encuadres",
  "jugadores.json"
);

async function leerRespaldo() {
  try {
    const contenido = await readFile(archivo, "utf8");
    return JSON.parse(contenido);
  } catch {
    return { version: 1, jugadores: {} };
  }
}

export async function GET() {
  try {
    const supabase = obtenerSupabaseServidor();

    const { data, error } = await supabase
      .from("libavime_configuracion")
      .select("datos")
      .eq("clave", CLAVE)
      .maybeSingle();

    if (error) {
      console.error("Error leyendo encuadres:", error);
      return NextResponse.json(
        { error: "No se pudieron cargar los encuadres." },
        { status: 500 }
      );
    }

    if (data?.datos) {
      return NextResponse.json(data.datos);
    }

    return NextResponse.json(await leerRespaldo());
  } catch (error) {
    console.error("Error en GET de encuadres:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los encuadres." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabaseAuth = await crearSupabaseServidor();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión nuevamente." },
        { status: 401 }
      );
    }

    const datos = await request.json();

    if (
      !datos ||
      typeof datos !== "object" ||
      !datos.jugadores ||
      typeof datos.jugadores !== "object" ||
      Array.isArray(datos.jugadores)
    ) {
      return NextResponse.json(
        { error: "Configuración de encuadres inválida." },
        { status: 400 }
      );
    }

    const documento = {
      version: 1,
      jugadores: datos.jugadores,
    };

    const supabase = obtenerSupabaseServidor();

    const { error } = await supabase
      .from("libavime_configuracion")
      .upsert(
        {
          clave: CLAVE,
          datos: documento,
          actualizado_en: new Date().toISOString(),
        },
        { onConflict: "clave" }
      );

    if (error) {
      console.error("Error guardando encuadres:", error);
      return NextResponse.json(
        { error: "No se pudieron guardar los encuadres." },
        { status: 500 }
      );
    }

    return NextResponse.json({ guardado: true });
  } catch (error) {
    console.error("Error procesando encuadres:", error);
    return NextResponse.json(
      { error: "No se pudieron guardar los encuadres." },
      { status: 500 }
    );
  }
}
