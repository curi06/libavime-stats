import { ImageResponse } from "next/og";

// Imagen al compartir las páginas de la plataforma (/quinteto, /ligas,
// /registro). Cada liga tiene la suya en app/[liga]/opengraph-image.tsx.
export const alt = "Quinteto Pro · Plataforma para ligas de baloncesto";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ImagenPlataforma() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          color: "white",
          background: "linear-gradient(135deg, #7c2d12 0%, #020617 55%, #1e3a8a 120%)",
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 8, color: "#fdba74", fontWeight: 700 }}>
          PLATAFORMA PARA LIGAS DE BALONCESTO
        </div>
        <div style={{ display: "flex", fontSize: 120, fontWeight: 900, marginTop: 16 }}>
          Quinteto<span style={{ color: "#fb923c", marginLeft: 24 }}>Pro</span>
        </div>
        <div style={{ fontSize: 36, color: "#e2e8f0", marginTop: 24 }}>
          Estadísticas automáticas · Planilla en vivo · Diseños para redes
        </div>
        <div style={{ fontSize: 30, color: "#fb923c", marginTop: 40, fontWeight: 700 }}>
          Gratis durante el lanzamiento
        </div>
      </div>
    ),
    size
  );
}
