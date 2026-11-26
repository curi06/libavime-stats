
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { crearSupabaseServidor } from "@/lib/supabase-server";
import { verificarAdministrador } from "@/lib/admin-auth";
import { resolverLiga, type LigaApi } from "@/lib/liga-api";
import { LIGA_HISTORICA } from "@/lib/liga";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CLAVE = "encuadres_jugadores";

// La liga principal conserva la clave histórica; las demás usan una
// clave propia mientras libavime_configuracion tenga "clave" como llave.
const claveDe = (liga: LigaApi) =>
  liga.slug === LIGA_HISTORICA ? CLAVE : `${CLAVE}:${liga.id}`;

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

export async function GET(request: Request) {
  try {
    // Los encuadres solo se consultan desde el editor administrativo.
    const supabaseAuth = await crearSupabaseServidor();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión para acceder al editor." },
        {
          status: 401,
          headers: { "Cache-Control": "private, no-store" },
        }
      );
    }

    const ligaRes = await resolverLiga(new URL(request.url).searchParams.get("liga"));
    if (ligaRes.respuesta) return ligaRes.respuesta;
    const { data: esMiembro } = await supabaseAuth.rpc("es_miembro_liga", {
      p_liga: ligaRes.liga.id,
    });
    if (esMiembro !== true) {
      return NextResponse.json({ error: "No tienes acceso a esta liga." }, { status: 403 });
    }

    const supabase = obtenerSupabaseServidor();

    const { data, error } = await supabase
      .from("libavime_configuracion")
      .select("datos")
      .eq("clave", claveDe(ligaRes.liga))
      .eq("liga_id", ligaRes.liga.id)
      .maybeSingle();

    if (error) {
      console.error("Error leyendo encuadres:", error);
      return NextResponse.json(
        { error: "No se pudieron cargar los encuadres." },
        { status: 500 }
      );
    }

    if (data?.datos) {
      return NextResponse.json(data.datos, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    // El archivo de respaldo solo contiene encuadres de la liga principal.
    const respaldo =
      ligaRes.liga.slug === LIGA_HISTORICA
        ? await leerRespaldo()
        : { version: 1, jugadores: {} };
    return NextResponse.json(respaldo, {
      headers: { "Cache-Control": "private, no-store" },
    });
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
    const datos = await request.json();
    const ligaRes = await resolverLiga(datos?.liga ?? new URL(request.url).searchParams.get("liga"));
    if (ligaRes.respuesta) return ligaRes.respuesta;

    const acceso = await verificarAdministrador("guardar encuadres", ligaRes.liga);
    if (acceso.respuesta) return acceso.respuesta;

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
          clave: claveDe(ligaRes.liga),
          liga_id: ligaRes.liga.id,
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
