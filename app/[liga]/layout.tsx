import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { LigaProvider } from "@/app/components/LigaContext";
import { obtenerLiga } from "@/lib/liga-servidor";
import { LIGA_HISTORICA, logoLiga, nombreCortoLiga } from "@/lib/liga";

type Props = {
  children: React.ReactNode;
  params: Promise<{ liga: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const datos = await obtenerLiga((await params).liga);
  if (!datos) return { title: "Liga no encontrada · Quinteto Pro" };

  const nombre = nombreCortoLiga(datos.liga);
  const descripcion =
    datos.liga.descripcion ??
    `Estadísticas, resultados, calendario y MVP de ${datos.liga.nombre}.`;
  return {
    title: { default: nombre, template: `%s · ${nombre}` },
    description: descripcion,
    icons: {
      icon: logoLiga(datos.liga),
      // Ícono al agregar la liga a la pantalla de inicio del iPhone.
      apple:
        datos.liga.slug === LIGA_HISTORICA
          ? "/icons/apple-touch-icon.png"
          : `/${datos.liga.slug}/icono/180`,
    },
    // "App" propia de la liga en Android (nombre, ícono, abre en su página).
    manifest: `/${datos.liga.slug}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: nombre, statusBarStyle: "default" },
    // La imagen la genera app/[liga]/opengraph-image.tsx.
    openGraph: {
      title: nombre,
      description: descripcion,
      siteName: "Quinteto Pro",
      locale: "es_DO",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: nombre, description: descripcion },
  };
}

export async function generateViewport({ params }: Props): Promise<Viewport> {
  const datos = await obtenerLiga((await params).liga);
  return { themeColor: datos?.liga.color_primario ?? "#111827" };
}

export default async function LayoutLiga({ children, params }: Props) {
  const datos = await obtenerLiga((await params).liga);
  if (!datos) notFound();

  return (
    <LigaProvider liga={datos.liga} equipos={datos.equipos} temporadas={datos.temporadas}>
      {children}
    </LigaProvider>
  );
}
