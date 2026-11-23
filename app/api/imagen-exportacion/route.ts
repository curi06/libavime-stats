import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Proxy limitado a imágenes públicas del Storage del proyecto. Esto evita que
// Safari móvil dependa de CORS al incrustar fotografías en un canvas.
export async function GET(request: NextRequest) {
  try {
    const origenConfig = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!origenConfig) {
      return NextResponse.json(
        { error: "No está configurada la URL de Supabase." },
        { status: 500 }
      );
    }

    const fuente = request.nextUrl.searchParams.get("src");
    if (!fuente) {
      return NextResponse.json(
        { error: "Falta la dirección de la imagen." },
        { status: 400 }
      );
    }

    const destino = new URL(fuente);
    const origenPermitido = new URL(origenConfig).origin;
    const rutaPublica =
      destino.pathname.startsWith("/storage/v1/object/public/") ||
      destino.pathname.startsWith("/storage/v1/render/image/public/");

    if (
      destino.protocol !== "https:" ||
      destino.origin !== origenPermitido ||
      !rutaPublica
    ) {
      return NextResponse.json(
        { error: "La imagen solicitada no pertenece al Storage público autorizado." },
        { status: 403 }
      );
    }

    const respuesta = await fetch(destino, {
      cache: "no-store",
      redirect: "error",
    });

    if (!respuesta.ok) {
      return NextResponse.json(
        { error: `No se pudo obtener la imagen (HTTP ${respuesta.status}).` },
        { status: respuesta.status }
      );
    }

    const tipo = respuesta.headers.get("content-type") || "";
    if (!tipo.startsWith("image/")) {
      return NextResponse.json(
        { error: "El recurso solicitado no es una imagen." },
        { status: 415 }
      );
    }

    const bytes = await respuesta.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: "La imagen está vacía o supera el tamaño permitido." },
        { status: 413 }
      );
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": tipo,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error preparando imagen para exportación:", error);
    return NextResponse.json(
      { error: "No se pudo preparar la imagen para exportarla." },
      { status: 500 }
    );
  }
}
