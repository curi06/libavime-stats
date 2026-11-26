
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { resolverLiga } from "@/lib/liga-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const ligaRes = await resolverLiga(new URL(request.url).searchParams.get("liga"));
    if (ligaRes.respuesta) return ligaRes.respuesta;

    const { data, error } = await supabase
      .from("jugadores")
      .select("id, nombre, foto")
      .eq("liga_id", ligaRes.liga.id)
      .order("nombre");

    if (error) {
      console.error("Error al cargar jugadores:", error);

      return NextResponse.json(
        { error: "No se pudieron cargar los jugadores." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      jugadores: data ?? [],
    });
  } catch (error) {
    console.error("Error en la ruta de jugadores:", error);

    return NextResponse.json(
      { error: "Ocurrió un error al consultar los jugadores." },
      { status: 500 }
    );
  }
}
