import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LigaProvider } from "@/app/components/LigaContext";
import { obtenerLiga } from "@/lib/liga-servidor";
import { logoLiga, nombreCortoLiga } from "@/lib/liga";

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
    icons: { icon: logoLiga(datos.liga) },
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

export default async function LayoutLiga({ children, params }: Props) {
  const datos = await obtenerLiga((await params).liga);
  if (!datos) notFound();

  return (
    <LigaProvider liga={datos.liga} equipos={datos.equipos} temporadas={datos.temporadas}>
      {children}
    </LigaProvider>
  );
}
