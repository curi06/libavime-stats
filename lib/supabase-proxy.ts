import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function protegerSesionAdmin(request: NextRequest) {
  let respuestaSupabase = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesParaGuardar, headers) {
          // Mantener sincronizados los tokens renovados en la solicitud y respuesta.
          cookiesParaGuardar.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          respuestaSupabase = NextResponse.next({ request });

          cookiesParaGuardar.forEach(({ name, value, options }) => {
            respuestaSupabase.cookies.set(name, value, options);
          });

          Object.entries(headers ?? {}).forEach(([nombre, valor]) => {
            respuestaSupabase.headers.set(nombre, valor);
          });
        },
      },
    }
  );

  // getClaims verifica la firma del token; no se confía en una cookie de sesión
  // simplemente porque el navegador la envíe.
  const { data, error } = await supabase.auth.getClaims();
  const usuarioAutenticado = Boolean(data?.claims?.sub) && !error;

  if (!usuarioAutenticado) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    destino.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    );

    const redireccion = NextResponse.redirect(destino);

    // Conservar cookies de renovación y encabezados anti-cache de Supabase.
    respuestaSupabase.cookies.getAll().forEach((cookie) => {
      redireccion.cookies.set(cookie);
    });

    for (const nombre of ["cache-control", "expires", "pragma"]) {
      const valor = respuestaSupabase.headers.get(nombre);
      if (valor) redireccion.headers.set(nombre, valor);
    }

    return redireccion;
  }

  return respuestaSupabase;
}
