import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { logoLiga, nombreCortoLiga, temporadaLiga, type Liga } from "@/lib/liga";

// Imagen que aparece al compartir el enlace de una liga (WhatsApp,
// Instagram, Facebook…). Se aplica también a sus páginas internas.
export const alt = "Liga en Quinteto Pro";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SITIO = process.env.NEXT_PUBLIC_SITIO_URL?.trim() || "https://libavime.vercel.app";

/** Descarga el logo y lo convierte en data URL; null si no se puede. */
async function logoComoDato(ruta: string): Promise<string | null> {
  try {
    const url = ruta.startsWith("http") ? ruta : `${SITIO}${ruta}`;
    const respuesta = await fetch(url, { cache: "force-cache" });
    const tipo = respuesta.headers.get("content-type") ?? "";
    if (!respuesta.ok || !tipo.startsWith("image/")) return null;
    const bytes = Buffer.from(await respuesta.arrayBuffer());
    return `data:${tipo};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function ImagenLiga({ params }: { params: Promise<{ liga: string }> }) {
  const slug = (await params).liga.toLowerCase();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data } = await supabase
    .from("ligas")
    .select("nombre, nombre_corto, ciudad, logo_url, color_primario, color_secundario, configuracion")
    .eq("slug", slug)
    .maybeSingle();
  const liga = data as Pick<Liga, "nombre" | "nombre_corto" | "ciudad" | "logo_url" | "color_primario" | "color_secundario" | "configuracion"> | null;

  const nombre = liga ? nombreCortoLiga(liga) : "Quinteto Pro";
  const subtitulo = liga
    ? [liga.nombre !== nombre ? liga.nombre : null, liga.ciudad].filter(Boolean).join(" · ")
    : "Plataforma para ligas de baloncesto";
  const primario = liga?.color_primario ?? "#1e3a8a";
  const secundario = liga?.color_secundario ?? "#f97316";
  const logo = liga ? await logoComoDato(logoLiga(liga)) : null;
  const iniciales = nombre.split(/\s+/).map((p) => p[0]).join("").slice(0, 3).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "70px",
          gap: "56px",
          color: "white",
          background: `linear-gradient(135deg, ${primario} 0%, #020617 60%, ${secundario} 130%)`,
        }}
      >
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: 150,
            background: "rgba(255,255,255,0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 0 10px ${secundario}`,
            flexShrink: 0,
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- ImageResponse usa <img>
            <img src={logo} width={250} height={250} style={{ objectFit: "contain" }} alt="" />
          ) : (
            <div style={{ fontSize: 110, fontWeight: 900, color: primario }}>{iniciales}</div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 28, letterSpacing: 6, color: "#fdba74", fontWeight: 700 }}>
            {liga ? `TEMPORADA ${temporadaLiga(liga)}` : "QUINTETO PRO"}
          </div>
          <div style={{ fontSize: nombre.length > 18 ? 64 : 88, fontWeight: 900, lineHeight: 1.05, marginTop: 12 }}>
            {nombre}
          </div>
          {subtitulo && (
            <div style={{ fontSize: 30, color: "#cbd5e1", marginTop: 16 }}>{subtitulo}</div>
          )}
          <div style={{ fontSize: 28, marginTop: 36, color: "#e2e8f0" }}>
            Estadísticas · Resultados · Calendario · MVP
          </div>
          <div style={{ fontSize: 24, marginTop: 28, color: "#fb923c", fontWeight: 700 }}>
            QUINTETO PRO
          </div>
        </div>
      </div>
    ),
    size
  );
}
