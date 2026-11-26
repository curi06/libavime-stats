
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verificarAdministrador } from "@/lib/admin-auth";
import { resolverLiga } from "@/lib/liga-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ligaRes = await resolverLiga(new URL(request.url).searchParams.get("liga"));
    if (ligaRes.respuesta) return ligaRes.respuesta;
    const acceso = await verificarAdministrador("ver los borradores", ligaRes.liga);
    if (acceso.respuesta) return acceso.respuesta;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Falta configurar Supabase en el servidor.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase
      .from("libavime_disenos")
      .select(
        "id, titulo, tipo, archivo, url, creado_en, jugador, categoria, jornada"
      )
      .eq("publicado", false)
      .eq("liga_id", ligaRes.liga.id)
      .order("creado_en", { ascending: false });

    if (error) {
      console.error("Error consultando borradores:", error);
      return NextResponse.json(
        { error: "No se pudieron cargar los borradores." },
        { status: 500 }
      );
    }

    return NextResponse.json({ borradores: data ?? [] });
  } catch (error) {
    console.error("Error en GET de borradores:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al cargar los borradores." },
      { status: 500 }
    );
  }
}
