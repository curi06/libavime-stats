import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return NextResponse.json(
        { error: "Correo y contraseña son obligatorios." },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ ok: true });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos." },
        { status: 401 }
      );
    }

    return response;
  } catch {
    return NextResponse.json(
      { error: "No se pudo iniciar sesión." },
      { status: 500 }
    );
  }
}
