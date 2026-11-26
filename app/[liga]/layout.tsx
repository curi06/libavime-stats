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
  return {
    title: { default: nombre, template: `%s · ${nombre}` },
    description: datos.liga.descripcion ?? datos.liga.nombre,
    icons: { icon: logoLiga(datos.liga) },
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
