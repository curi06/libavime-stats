"use client";

import { createContext, Fragment, useContext, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  logoLiga,
  nombreCortoLiga,
  rutaLiga,
  resolverTemporada,
  temporadaActivaDe,
  temporadaLiga,
  type EquipoLiga,
  type Liga,
  type TemporadaLiga,
} from "@/lib/liga";

type ValorLiga = {
  liga: Liga;
  equipos: EquipoLiga[];
  nombre: string;
  temporada: string;
  logo: string;
  /** Arma una dirección dentro de la liga: ruta("/estadisticas"). */
  ruta: (ruta?: string) => string;
  /** Busca un equipo por nombre o slug (sin importar mayúsculas). */
  equipo: (nombreOSlug: string | null | undefined) => EquipoLiga | undefined;
  /** Temporadas de la liga (más reciente primero). */
  temporadas: TemporadaLiga[];
  /** Temporada que se está viendo (?temporada= o la activa). */
  temporadaSeleccionada: TemporadaLiga | null;
  /** Id para filtrar consultas por temporada (-1 si la liga no tiene). */
  temporadaId: number;
  esTemporadaActiva: boolean;
};

const ContextoLiga = createContext<ValorLiga | null>(null);

export function LigaProvider({
  liga,
  equipos,
  temporadas,
  children,
}: {
  liga: Liga;
  equipos: EquipoLiga[];
  temporadas: TemporadaLiga[];
  children: React.ReactNode;
}) {
  const parametroTemporada = useSearchParams().get("temporada");

  const valor = useMemo<ValorLiga>(() => {
    const activa = temporadaActivaDe(temporadas);
    const seleccionada = resolverTemporada(temporadas, parametroTemporada);
    const esActiva = !seleccionada || seleccionada.id === activa?.id;
    // Solo las temporadas anteriores viajan en los enlaces (?temporada=).
    const temporadaEnEnlaces = esActiva ? null : seleccionada.id;
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
      temporada: esActiva
        ? temporadaLiga(liga)
        : seleccionada.nombre.replace(/^temporada\s+/i, "").trim() || seleccionada.nombre,
      logo: logoLiga(liga),
      ruta: (ruta = "/") => rutaLiga(liga.slug, ruta, temporadaEnEnlaces),
      equipo: (nombreOSlug) => indice.get(clave(nombreOSlug)),
      temporadas,
      temporadaSeleccionada: seleccionada,
      temporadaId: seleccionada?.id ?? -1,
      esTemporadaActiva: esActiva,
    };
  }, [liga, equipos, temporadas, parametroTemporada]);

  // Al cambiar de temporada se vuelve a montar el contenido para que cada
  // página recargue sus datos con el nuevo filtro.
  return (
    <ContextoLiga.Provider value={valor}>
      <Fragment key={valor.temporadaId}>{children}</Fragment>
    </ContextoLiga.Provider>
  );
}

export function useLiga() {
  const valor = useContext(ContextoLiga);
  if (!valor) {
    throw new Error("useLiga debe usarse dentro de una página de liga (app/[liga]).");
  }
  return valor;
}
