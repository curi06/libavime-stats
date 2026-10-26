
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { crearSupabaseServidor } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabaseAuth = await crearSupabaseServidor();
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para ver los borradores." },
        { status: 401 }
      );
    }

    const correoAdministrador = process.env.LIBAVIME_ADMIN_EMAIL
      ?.trim()
      .toLowerCase();

    const correoUsuario = user.email?.trim().toLowerCase();

    if (
      !correoAdministrador ||
      !correoUsuario ||
      correoUsuario !== correoAdministrador
    ) {
      return NextResponse.json(
        { error: "No tienes permiso para ver los borradores." },
        { status: 403 }
      );
    }

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
