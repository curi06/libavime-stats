"use client";

import { createContext, useContext, useMemo } from "react";
import {
  logoLiga,
  nombreCortoLiga,
  rutaLiga,
  type EquipoLiga,
  type Liga,
} from "@/lib/liga";

type ValorLiga = {
  liga: Liga;
  equipos: EquipoLiga[];
  nombre: string;
  logo: string;
  /** Arma una dirección dentro de la liga: ruta("/estadisticas"). */
  ruta: (ruta?: string) => string;
  /** Busca un equipo por nombre o slug (sin importar mayúsculas). */
  equipo: (nombreOSlug: string | null | undefined) => EquipoLiga | undefined;
};

const ContextoLiga = createContext<ValorLiga | null>(null);

export function LigaProvider({
  liga,
  equipos,
  children,
}: {
  liga: Liga;
  equipos: EquipoLiga[];
  children: React.ReactNode;
}) {
  const valor = useMemo<ValorLiga>(() => {
    const clave = (v: string | null | undefined) =>
      String(v ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .trim()
        .toLowerCase();
    const indice = new Map<string, EquipoLiga>();
    equipos.forEach((e) => {
      indice.set(clave(e.nombre), e);
      indice.set(clave(e.slug), e);
    });

    return {
      liga,
      equipos,
      nombre: nombreCortoLiga(liga),
      logo: logoLiga(liga),
      ruta: (ruta = "/") => rutaLiga(liga.slug, ruta),
      equipo: (nombreOSlug) => indice.get(clave(nombreOSlug)),
    };
  }, [liga, equipos]);

  return <ContextoLiga.Provider value={valor}>{children}</ContextoLiga.Provider>;
}

export function useLiga() {
  const valor = useContext(ContextoLiga);
  if (!valor) {
    throw new Error("useLiga debe usarse dentro de una página de liga (app/[liga]).");
  }
  return valor;
}
