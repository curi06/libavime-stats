import { NextResponse, type NextRequest } from "next/server";
import { protegerSesionAdmin } from "@/lib/supabase-proxy";
import { LIGA_PRINCIPAL, SECCIONES_LIGA } from "@/lib/liga";

const SECCIONES = new Set<string>(SECCIONES_LIGA);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [primero, segundo] = pathname.split("/").filter(Boolean);

  // Direcciones antiguas sin liga (/estadisticas, /admin/partidos, ...):
  // redirigen a la liga principal para no romper enlaces compartidos.
  if (primero && SECCIONES.has(primero)) {
    const destino = request.nextUrl.clone();
    destino.pathname = `/${LIGA_PRINCIPAL}${pathname}`;
    destino.search = search;
    return NextResponse.redirect(destino, 308);
  }

  // La portada del dominio actual sigue mostrando la liga principal.
  if (!primero) {
    const destino = request.nextUrl.clone();
    destino.pathname = `/${LIGA_PRINCIPAL}`;
    return NextResponse.rewrite(destino);
  }

  // Administración de cualquier liga: exige sesión.
  if (segundo === "admin") {
    return protegerSesionAdmin(request);
  }

  return NextResponse.next();
}

export const config = {
  // Todo menos la API, archivos internos de Next y archivos estáticos.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:png|jpe?g|JPG|svg|webp|ico|gif|txt|xml)$).*)",
  ],
};
