import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { logoLiga, nombreCortoLiga, type Liga } from "@/lib/liga";

// Ícono de "app" de cada liga (pantalla de inicio del celular): su logo
// sobre su color. Tamaños: 180 (iPhone), 192 y 512 (Android).
const TAMANOS = new Set([180, 192, 512]);
const SITIO = process.env.NEXT_PUBLIC_SITIO_URL?.trim() || "https://libavime.vercel.app";

async function logoComoDato(ruta: string) {
  try {
    const url = ruta.startsWith("http") ? ruta : `${SITIO}${ruta}`;
    const r = await fetch(url, { cache: "force-cache", signal: AbortSignal.timeout(4000) });
    const tipo = r.headers.get("content-type") ?? "";
    if (!r.ok || !tipo.startsWith("image/")) return null;
    return `data:${tipo};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ liga: string; tamano: string }> }
) {
  const { liga: slug, tamano } = await params;
  const lado = Number(tamano);
  if (!TAMANOS.has(lado)) return new Response("Tamaño no válido", { status: 404 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data } = await supabase
    .from("ligas")
    .select("nombre, nombre_corto, logo_url, color_primario, configuracion")
    .eq("slug", slug.toLowerCase())
    .maybeSingle();
  const liga = data as Pick<Liga, "nombre" | "nombre_corto" | "logo_url" | "color_primario" | "configuracion"> | null;
  if (!liga) return new Response("Liga no encontrada", { status: 404 });

  const logo = await logoComoDato(liga.configuracion?.logo_compartir || logoLiga(liga));
  const iniciales = nombreCortoLiga(liga)
    .split(/\s+/)
    .filter((p) => !["de", "del", "la", "las", "el", "los", "y"].includes(p.toLowerCase()))
    .map((p) => p[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: liga.color_primario || "#1e3a8a",
        }}
      >
        <div
          style={{
            width: lado * 0.8,
            height: lado * 0.8,
            borderRadius: lado * 0.4,
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- ImageResponse usa <img>
            <img src={logo} width={lado * 0.72} height={lado * 0.72} style={{ objectFit: "contain", borderRadius: lado * 0.36 }} alt="" />
          ) : (
            <div style={{ fontSize: lado * 0.32, fontWeight: 900, color: liga.color_primario || "#1e3a8a" }}>{iniciales}</div>
          )}
        </div>
      </div>
    ),
    {
      width: lado,
      height: lado,
      headers: { "Cache-Control": "public, max-age=86400" },
    }
  );
}
