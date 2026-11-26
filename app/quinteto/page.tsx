import type { Metadata } from "next";
import Presentacion from "@/app/components/plataforma/Presentacion";

export const metadata: Metadata = {
  title: "Quinteto Pro · Plataforma para ligas de baloncesto",
  description:
    "Estadísticas automáticas, planilla en vivo y diseños para redes sociales para tu liga de baloncesto. Gratis durante el lanzamiento.",
};

export default function QuintetoPage() {
  return <Presentacion />;
}
