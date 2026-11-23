
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toJpeg, toPng } from "html-to-image";
import { supabase } from "@/lib/supabase";

type Tipo =
  | "jugador"
  | "lideres"
  | "posiciones"
  | "destacados"
  | "destacado_individual"
  | "mvp"
  | "finales";
type Formato = "historia" | "post";
type Categoria = "puntos" | "rebotes" | "asistencias";

type Jugador = {
  id: string | number;
  nombre: string;
  equipo?: string | null;
  foto?: string | null;
  puntos: number;
  rebotes: number;
  asistencias: number;
  pj: number;
};

type Equipo = {
  nombre: string;
  pj: number;
  pg: number;
  pp: number;
  pf: number;
  pc: number;
  dif: number;
};
type CandidatoMVP = Jugador & {
  ppg: number;
  rpg: number;
  apg: number;
  partidos_jugados: number;
  posicion_equipo: number;
  puntuacion_mvp: number;
};
type AjusteFormato = {
  x: number;
  y: number;
  zoom: number;
};

type Encuadre = {
  x: number;
  y: number;
  zoom: number;
  post?: AjusteFormato;
  historia?: AjusteFormato;
};

const LOGO = "/logos/LIBAVIME.png";
const NOMBRES_EQUIPOS = [
  "Espartanos",
  "Vikingos",
  "Gladiadores",
  "Titanes",
];

const FOTOS_LOCALES: Record<string, string> = {
  "albert heredia": "Albert heredia_noBackground.png",
  "alvaro ruiz": "Alvaro ruiz_noBackground.png",
  "aris mendez": "Aris mendez_noBackground.png",
  "carlos dotel": "Carlos dotel_noBackground.png",
  "cesar jimenez": "Cesar jimenez_noBackground.png",
  "cristian lorenzo": "Cristian lorenzo_noBackground.png",
  "cristina lorenzo": "Cristina lorenzo_noBackground.png",
  "eddy minaya": "Eddy minaya_noBackground.png",
  "edric rosario": "Edric rosario_noBackground.png",
  "edrick rosario": "Edrick rosario_noBackground.png",
  "edward sanchez": "Edward sanchez_noBackground.png",
  "elias de jesus": "Elias de jesus_noBackground.png",
  "elias martinez": "Elias martinez_noBackground.png",
  "eliceo de jesus": "Eliceo de jesus_noBackground.png",
  "eliceo martinez": "Eliceo martinez_noBackground.png",
  "emmi de la cruz": "Emmi de la cruz_noBackground.png",
  "engel ramirez": "Engel ramirez_noBackground.png",
  "engels ramirez": "Engels ramirez_noBackground.png",
  "enmanuel hernandez": "Enmanuel hernandez_noBackground.png",
  "fabio baez": "Fabio baez_noBackground.png",
  "felix santiago": "Felix santiago_noBackground.png",
  "fernando valenzuela": "Fernando valenzuela_noBackground.png",
  "francisco damian": "Francisco damian_noBackground.png",
  "frank albert": "Frank albert_noBackground.png",
  "gabriel matos": "Gabriel matos_noBackground.png",
  "gregory valdez": "Gregory Valdez_noBackground.png",
  "hender martinez": "Hender martinez_noBackground.png",
  "jacob santana": "Jacob santana_noBackground.png",
  "jhomar perez": "Jhomar perez_noBackground.png",
  "jhonny sepulveda": "Jhonny sepulveda_noBackground.png",
  "johnny sepulveda": "Johnny sepulveda_noBackground.png",
  "jose luis": "Jose luis_noBackground.png",
  "juan mendez": "Juan mendez_noBackground.png",
  "julio rincon": "Julio rincon_noBackground.png",
  "manuel severino": "Manuel Severino_noBackground.png",
  "misael medrano": "Misael Medrano_noBackground.png",
  "moises nunez": "moises nunez_noBackground.png",
  "omar minaya": "Omar minaya_noBackground.png",
  "pedro martinez": "Pedro martinez_noBackground.png",
  "rey fernandez": "Rey fernandez_noBackground.png",
  "ricardo rodriguez": "Ricardo rodriguez_noBackground.png",
  "ricki mendez": "Ricki mendez_noBackground.png",
  "ricky guzman": "Ricky guzman_noBackground.png",
  "ricky mendez": "Ricky mendez_noBackground.png",
  "vicente valenzuela": "Vicente valenzuela_noBackground.png",
  "victor leonardo": "Victor leonardo_noBackground.png",
  "victor manuel": "Victor manuel_noBackground.png",
  "welmert de los santos": "Welmert de los santos_noBackground.png",
  "wilmer pacheco": "Wilmer pacheco_noBackground.png",
  "diomedes del villar": "diomedes del villar_noBackground.png",
  "diraeli de los santos": "diraeli de los santos_noBackground.png",
  "disraeli de los santos": "disraeli de los santos_noBackground.png",
  "manuel heredia": "manuel heredia_noBackground.png"
};

function obtenerRutaFotoInstagram(nombreJugador: string) {
  const nombre = nombreJugador
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  const archivo = FOTOS_LOCALES[nombre];
  if (archivo) {
    return `/backgrounds/jugadores/${encodeURIComponent(archivo)}`;
  }

  if (nombre === "alvaro ruiz") {
    return "/backgrounds/alvaro-recortado.png";
  }

  return "";
}

function normalizar(valor: unknown) {
  return String(valor ?? "").trim().toLocaleLowerCase();
}

function fotoValida(foto?: string | null) {
  if (!foto) return "";
  const valor = foto.trim();
  return valor.startsWith("/") || valor.startsWith("https://") || valor.startsWith("http://")
    ? valor
    : "";
}

export default function InstagramPage() {
  const [tipo, setTipo] = useState<Tipo>("jugador");
  const [modoIndividualDestacado, setModoIndividualDestacado] = useState(false);
  const arrastreFotoRef = useRef<{ pointerId: number; startX: number; startY: number; x: number; y: number; factor: number } | null>(null);
  const [formato, setFormato] = useState<Formato>("post");
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [encuadres, setEncuadres] = useState<Record<string, Encuadre>>({});
  const arteRef = useRef<HTMLDivElement>(null);
  const copiaVistaRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  fetch("/api/encuadres")
    .then((respuesta) => {
      if (!respuesta.ok) {
        throw new Error("No se pudieron cargar los encuadres");
      }

      return respuesta.json();
    })
    .then((datos) => {
      setEncuadres(datos.jugadores ?? {});
    })
    .catch((error) => {
      console.error("Error cargando encuadres:", error);
    });
}, []);
useEffect(() => {
  const original = arteRef.current;
  const destino = copiaVistaRef.current;

  if (!original || !destino) return;

  const actualizarCopia = () => {
    destino.replaceChildren(original.cloneNode(true));
  };

  actualizarCopia();

  const observador = new MutationObserver(() => {
    actualizarCopia();
  });

  observador.observe(original, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
  });

  return () => observador.disconnect();
}, []);

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [jugadorId, setJugadorId] = useState("");
  const [fechaJornada, setFechaJornada] = useState("");
  const [equipoDestacadoIndex, setEquipoDestacadoIndex] = useState(0);
  const [candidatoMVPIndex, setCandidatoMVPIndex] = useState(0);
  const [liderCategoriaIndex, setLiderCategoriaIndex] = useState(0);
  const [jugadorVistaPreviaId, setJugadorVistaPreviaId] = useState("");
  const [jugadorEncuadreId, setJugadorEncuadreId] = useState("");
  const [liderEncuadreId, setLiderEncuadreId] = useState("");
  const [jugadorIndividualEncuadreId, setJugadorIndividualEncuadreId] = useState("");
const [guardandoEncuadre, setGuardandoEncuadre] = useState(false);
  const [fechasJornada, setFechasJornada] = useState<string[]>([]);
  const [estadisticasJornada, setEstadisticasJornada] = useState<any[]>([]);
const [partidosJornada, setPartidosJornada] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState("");

  // Permite abrir el editor directamente desde una tarjeta de Estadísticas.
  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    const modoIndividual = parametros.get("individual") === "1";
    if (parametros.get("tipo") === "destacados") {
      setTipo(modoIndividual ? "destacado_individual" : "destacados");
    }
    const fecha = parametros.get("fecha");
    if (fecha) setFechaJornada(fecha);

    const jugadorSeleccionado = parametros.get("jugador");
    if (jugadorSeleccionado) setJugadorEncuadreId(jugadorSeleccionado);

    setModoIndividualDestacado(modoIndividual);
    const formatoParametro = parametros.get("formato");
    if (formatoParametro === "historia" || formatoParametro === "post") {
      setFormato(formatoParametro);
    }
  }, []);



  useEffect(() => {
    let activo = true;

    async function cargarDatos() {
      setCargando(true);
      setError("");

      console.log("Iniciando carga de datos de Instagram...");

      const [
        jugadoresResp,
        estadisticasResp,
        partidosResp,
      ] = await Promise.all([

        supabase.from("jugadores").select("*").order("nombre"),
        supabase
          .from("estadisticas_partido")
          .select("jugador_id, partido_id, puntos, rebotes, asistencias, estado"),
        supabase
  .from("partidos")
  .select(
    "id, fecha, equipo_local, equipo_visitante, puntos_local, puntos_visitante, estado"
  )
  .eq("estado", "Finalizado"),
      ]);
console.log("Resultado de carga:", {
  jugadores: jugadoresResp.error ?? jugadoresResp.data?.length,
  estadisticas: estadisticasResp.error ?? estadisticasResp.data?.length,
  partidos: partidosResp.error ?? partidosResp.data?.length,
});
      if (!activo) return;

      const errorCarga =
        jugadoresResp.error ||
        estadisticasResp.error ||
        partidosResp.error;

      if (errorCarga) {
        console.error(errorCarga);
        setError(
          "No se pudieron cargar los datos de Supabase. Revisa la conexión y los permisos."
        );
        setCargando(false);
        return;
      }

      const partidos = partidosResp.data ?? [];
     const fechasDisponibles = Array.from(
  new Set(
    partidos
      .map((p: any) => String(p.fecha ?? "").slice(0, 10))
      .filter(Boolean)
  )
).sort((a, b) => b.localeCompare(a));

setFechasJornada(fechasDisponibles);

if (fechasDisponibles.length > 0) {
  setFechaJornada((actual) => actual || fechasDisponibles[0]);
}

console.log("Fechas de los partidos:", fechasDisponibles);
      const estadisticas = estadisticasResp.data ?? [];
      setPartidosJornada(partidos);
setEstadisticasJornada(estadisticas);
      const jugadoresOriginales = jugadoresResp.data ?? [];
      const partidosFinalizados = new Set(
        partidos.map((p: any) => String(p.id))
      );

      const acumulados = new Map<
        string,
        {
          partidos: Set<string>;
          puntos: number;
          rebotes: number;
          asistencias: number;
        }
      >();

      estadisticas.forEach((registro: any) => {
        const idPartido = String(registro.partido_id);
        const idJugador = String(registro.jugador_id);

        if (!partidosFinalizados.has(idPartido)) return;
        if (
          registro.estado === "no_jugo" ||
          registro.estado === "lesionado"
        ) {
          return;
        }

        if (!acumulados.has(idJugador)) {
          acumulados.set(idJugador, {
            partidos: new Set<string>(),
            puntos: 0,
            rebotes: 0,
            asistencias: 0,
          });
        }

        const datos = acumulados.get(idJugador)!;
        datos.partidos.add(idPartido);
        datos.puntos += Number(registro.puntos) || 0;
        datos.rebotes += Number(registro.rebotes) || 0;
        datos.asistencias += Number(registro.asistencias) || 0;
      });

      const lista: Jugador[] = jugadoresOriginales.map((j: any) => {
        const datos = acumulados.get(String(j.id));

        return {
          ...j,
          puntos: datos?.puntos ?? 0,
          rebotes: datos?.rebotes ?? 0,
          asistencias: datos?.asistencias ?? 0,
          pj: datos?.partidos.size ?? 0,
        };
      });

      setJugadores(lista);

      if (lista.length) {
        setJugadorId(String(lista[0].id));
      }

      const clasificacion: Equipo[] = NOMBRES_EQUIPOS.map((nombre) => {
        let pj = 0;
        let pg = 0;
        let pp = 0;
        let pf = 0;
        let pc = 0;

        partidos.forEach((p: any) => {
          if (p.puntos_local == null || p.puntos_visitante == null) return;

          const local = normalizar(p.equipo_local);
          const visitante = normalizar(p.equipo_visitante);
          const equipo = normalizar(nombre);

          if (local === equipo) {
            const favor = Number(p.puntos_local);
            const contra = Number(p.puntos_visitante);
            pj++;
            pf += favor;
            pc += contra;
            if (favor > contra) pg++;
            if (favor < contra) pp++;
          }

          if (visitante === equipo) {
            const favor = Number(p.puntos_visitante);
            const contra = Number(p.puntos_local);
            pj++;
            pf += favor;
            pc += contra;
            if (favor > contra) pg++;
            if (favor < contra) pp++;
          }
        });

        return {
          nombre,
          pj,
          pg,
          pp,
          pf,
          pc,
          dif: pf - pc,
        };
      }).sort(
        (a, b) =>
          b.pg - a.pg ||
          b.dif - a.dif ||
          b.pf - a.pf ||
          a.nombre.localeCompare(b.nombre)
      );

      setEquipos(clasificacion);
      setCargando(false);
    }

    cargarDatos();

    return () => {
      activo = false;
    };
  }, []);

  const jugador = useMemo(
    () => jugadores.find((j) => String(j.id) === jugadorId) ?? jugadores[0],
    [jugadores, jugadorId]
  );
  const encuadreJugador = jugador
  ? (() => {
      const guardado = encuadres[String(jugador.id)];

      if (!guardado) {
        return { x: 0, y: 0, zoom: 1 };
      }

      const formatoGuardado =
        formato === "post" ? guardado.post : guardado.historia;

      return formatoGuardado ?? {
        x: guardado.x ?? 0,
        y: guardado.y ?? 0,
        zoom: guardado.zoom ?? 1,
      };
    })()
  : { x: 0, y: 0, zoom: 1 };

const zoomBase = formato === "post" ? 72 : 100;
const destacadosJornada = useMemo(() => {
  const partidosDeFecha = partidosJornada.filter(
    (p: any) =>
      String(p.fecha ?? "").slice(0, 10) === fechaJornada
  );

  const idsPartidos = new Set(
    partidosDeFecha.map((p: any) => String(p.id))
  );

  const estadisticasPorJugador = new Map<string, any>();

  estadisticasJornada.forEach((registro: any) => {
    const idPartido = String(registro.partido_id);
    const idJugador = String(registro.jugador_id);

    if (!idsPartidos.has(idPartido)) return;

    if (
      registro.estado === "no_jugo" ||
      registro.estado === "lesionado"
    ) {
      return;
    }

    const jugadorDatos = jugadores.find(
      (j) => String(j.id) === idJugador
    );

    if (!jugadorDatos) return;

    if (!estadisticasPorJugador.has(idJugador)) {
      estadisticasPorJugador.set(idJugador, {
        ...jugadorDatos,
        puntos: 0,
        rebotes: 0,
        asistencias: 0,
      });
    }

    const datos = estadisticasPorJugador.get(idJugador);

    datos.puntos += Number(registro.puntos) || 0;
    datos.rebotes += Number(registro.rebotes) || 0;
    datos.asistencias += Number(registro.asistencias) || 0;
  });

  return NOMBRES_EQUIPOS.flatMap((nombreEquipo) => {
    const jugadoresEquipo = Array.from(
      estadisticasPorJugador.values()
    )
      .filter(
        (j: any) =>
          normalizar(j.equipo) === normalizar(nombreEquipo) &&
          (j.puntos > 0 || j.rebotes > 0 || j.asistencias > 0)
      )
      .sort(
        (a: any, b: any) =>
          b.puntos - a.puntos ||
          b.rebotes - a.rebotes ||
          b.asistencias - a.asistencias
      );

    return jugadoresEquipo.slice(0, 2);
  });
}, [
  partidosJornada,
  estadisticasJornada,
  jugadores,
  fechaJornada,
]);
const destacadosPorEquipo = useMemo(() => {
  return NOMBRES_EQUIPOS.map((equipo) => ({
    equipo,
    jugadores: destacadosJornada
      .filter(
        (j: any) =>
          normalizar(j.equipo) === normalizar(equipo)
      )
      .slice(0, 2),
  }));
}, [destacadosJornada]);

  const destacadoIndividual = useMemo(
    () =>
      destacadosJornada.find(
        (jugador: any) => String(jugador.id) === jugadorEncuadreId
      ) ?? null,
    [destacadosJornada, jugadorEncuadreId]
  );

  useEffect(() => {
    if (!modoIndividualDestacado || destacadosJornada.length === 0) return;

    let seleccionado = destacadosJornada.find(
      (jugador: any) => String(jugador.id) === jugadorEncuadreId
    );

    // Al cambiar de fecha, selecciona un destacado disponible de esa jornada.
    if (!seleccionado) {
      seleccionado = destacadosJornada[0];
      setJugadorEncuadreId(String(seleccionado.id));
    }

    const indiceEquipo = NOMBRES_EQUIPOS.findIndex(
      (nombre) => normalizar(nombre) === normalizar(seleccionado.equipo)
    );
    if (indiceEquipo >= 0) setEquipoDestacadoIndex(indiceEquipo);
  }, [modoIndividualDestacado, destacadosJornada, jugadorEncuadreId]);

  function actualizarEncuadreDestacado(
    campo: "x" | "y" | "zoom",
    valor: number
  ) {
    if (!jugadorEncuadreId) return;

    setEncuadres((actual) => {
      const anterior = actual[jugadorEncuadreId] ?? {
        x: 0,
        y: 0,
        zoom: 1,
      };
      const anteriorFormato = anterior[formato] ?? {
        x: anterior.x ?? 0,
        y: anterior.y ?? 0,
        zoom: anterior.zoom ?? 1,
      };

      return {
        ...actual,
        [jugadorEncuadreId]: {
          ...anterior,
          [formato]: {
            ...anteriorFormato,
            [campo]: valor,
          },
        },
      };
    });
  }

  function iniciarArrastreFoto(evento: any, ajuste: AjusteFormato) {
    if (evento.button !== undefined && evento.button !== 0) return;

    const marco = arteRef.current?.getBoundingClientRect();
    const factor = marco?.width ? ancho / marco.width : 1;

    arrastreFotoRef.current = {
      pointerId: evento.pointerId,
      startX: evento.clientX,
      startY: evento.clientY,
      x: ajuste.x,
      y: ajuste.y,
      factor,
    };

    evento.currentTarget.setPointerCapture?.(evento.pointerId);
  }

  function moverArrastreFoto(evento: any) {
    const arrastre = arrastreFotoRef.current;
    if (!arrastre || arrastre.pointerId !== evento.pointerId) return;

    const desplazamientoX = (evento.clientX - arrastre.startX) * arrastre.factor;
    const desplazamientoY = (evento.clientY - arrastre.startY) * arrastre.factor;

    actualizarEncuadreDestacado(
      "x",
      Math.max(-180, Math.min(180, Math.round(arrastre.x + desplazamientoX)))
    );
    actualizarEncuadreDestacado(
      "y",
      Math.max(-260, Math.min(260, Math.round(arrastre.y + desplazamientoY)))
    );
  }

  function terminarArrastreFoto(evento: any) {
    if (arrastreFotoRef.current?.pointerId === evento.pointerId) {
      arrastreFotoRef.current = null;
    }
  }

  // Un ganador oficial por cada categoría estadística.
  const ganadoresPorCategoria = useMemo(() => {
    const categorias: Categoria[] = ["puntos", "rebotes", "asistencias"];

    return categorias.map((categoria) => ({
      categoria,
      jugador:
        [...jugadores]
          .filter((j) => j[categoria] > 0)
          .sort((a, b) => b[categoria] - a[categoria])[0] ?? null,
    }));
  }, [jugadores]);

  // Evita repetir un jugador en el selector de ajuste de fotografías
  // cuando lidera más de una categoría.
  const lideres = useMemo(() => {
    const unicos = new Map<string, Jugador>();

    ganadoresPorCategoria.forEach(({ jugador }) => {
      if (jugador) unicos.set(String(jugador.id), jugador);
    });

    return Array.from(unicos.values());
  }, [ganadoresPorCategoria]);
  const candidatosMVP = useMemo<CandidatoMVP[]>(() => {
  // 1. Calcular promedios individuales y participación
  const jugadoresConPromedios = jugadores.map((jugador) => {
    const equipo = equipos.find(
      (e) => normalizar(e.nombre) === normalizar(jugador.equipo)
    );

    const partidosEquipo = equipo?.pj ?? 0;

    const ppg =
      jugador.pj > 0
        ? Number((jugador.puntos / jugador.pj).toFixed(1))
        : 0;

    const rpg =
      jugador.pj > 0
        ? Number((jugador.rebotes / jugador.pj).toFixed(1))
        : 0;

    const apg =
      jugador.pj > 0
        ? Number((jugador.asistencias / jugador.pj).toFixed(1))
        : 0;

    return {
      ...jugador,
      ppg,
      rpg,
      apg,
      partidos_jugados: jugador.pj,
      posicion_equipo: equipo
        ? equipos.findIndex(
            (e) => normalizar(e.nombre) === normalizar(jugador.equipo)
          ) + 1
        : 0,
      partidos_equipo: partidosEquipo,
    };
  });

  // 2. Elegibilidad: mínimo 60% de participación
  const jugadoresElegibles = jugadoresConPromedios.filter(
    (jugador) => {
      if (jugador.partidos_equipo === 0) return false;

      const participacion =
        jugador.partidos_jugados / jugador.partidos_equipo;

      return (
        jugador.partidos_jugados > 0 &&
        participacion >= 0.60 &&
        (jugador.ppg > 0 || jugador.apg > 0 || jugador.rpg > 0)
      );
    }
  );

  // 3. Mejores promedios de cada categoría
  const maxPPG = Math.max(
    ...jugadoresElegibles.map((j) => j.ppg),
    0
  );

  const maxAPG = Math.max(
    ...jugadoresElegibles.map((j) => j.apg),
    0
  );

  const maxRPG = Math.max(
    ...jugadoresElegibles.map((j) => j.rpg),
    0
  );

  // 4. Aplicar la fórmula oficial MVP
  return jugadoresElegibles
    .map((jugador) => {
      const puntosNormalizados =
        maxPPG > 0 ? (jugador.ppg / maxPPG) * 100 : 0;

      const asistenciasNormalizadas =
        maxAPG > 0 ? (jugador.apg / maxAPG) * 100 : 0;

      const rebotesNormalizados =
        maxRPG > 0 ? (jugador.rpg / maxRPG) * 100 : 0;

      const posicion = jugador.posicion_equipo;

      const puntuacionPosicion =
        posicion > 0
          ? equipos.length > 1
            ? ((equipos.length - posicion) /
                (equipos.length - 1)) * 100
            : 100
          : 0;

      const puntuacionMVP =
        puntosNormalizados * 0.30 +
        asistenciasNormalizadas * 0.25 +
        rebotesNormalizados * 0.20 +
        puntuacionPosicion * 0.25;

      return {
        ...jugador,
        puntuacion_mvp: Number(puntuacionMVP.toFixed(2)),
      };
    })
    .sort((a, b) => {
      if (b.puntuacion_mvp !== a.puntuacion_mvp) {
        return b.puntuacion_mvp - a.puntuacion_mvp;
      }

      if (b.ppg !== a.ppg) return b.ppg - a.ppg;
      if (b.apg !== a.apg) return b.apg - a.apg;

      return b.rpg - a.rpg;
    })
    .slice(0, 6);
}, [jugadores, equipos]);

  const ancho = 360;
  const alto = formato === "historia" ? 640 : 450;

  async function descargar() {
    if (!arteRef.current) return;

    // Descarga tres archivos independientes, uno por categoría, como el flujo MVP.
    if (tipo === "lideres") {
      if (!ganadoresPorCategoria.some(({ jugador }) => jugador)) {
        setError("No hay ganadores disponibles para descargar.");
        return;
      }

      setDescargando(true);
      setError("");

      try {
        await document.fonts.ready;

        for (let i = 0; i < ganadoresPorCategoria.length; i++) {
          const ganador = ganadoresPorCategoria[i]?.jugador;
          if (!ganador) continue;

          setLiderCategoriaIndex(i);

          // Esperar a que React actualice la tarjeta activa antes de capturarla.
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => resolve())
            )
          );

          const elemento = arteRef.current;
          if (!elemento) continue;

          const imagenes = Array.from(elemento.querySelectorAll("img"));
          await Promise.all(
            imagenes.map((img) => {
              if (img.complete) return Promise.resolve();
              return new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              });
            })
          );

          const esHistoria = formato === "historia";
          const png = await toPng(elemento, {
            cacheBust: true,
            pixelRatio: 3,
            width: ancho,
            height: alto,
            canvasWidth: 1080,
            canvasHeight: esHistoria ? 1920 : 1350,
            backgroundColor: "#07152e",
            style: {
              width: `${ancho}px`,
              height: `${alto}px`,
              minWidth: `${ancho}px`,
              minHeight: `${alto}px`,
              maxWidth: `${ancho}px`,
              maxHeight: `${alto}px`,
            },
          });

          const nombreJugador = ganador.nombre
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .toLowerCase();
          const nombreCategoria = ganadoresPorCategoria[i].categoria;

          const enlace = document.createElement("a");
          enlace.href = png;
          enlace.download = `libavime-lider-${nombreCategoria}-${nombreJugador}-${formato}.png`;
          enlace.style.display = "none";
          document.body.appendChild(enlace);
          enlace.click();
          enlace.remove();

          await new Promise((resolve) => setTimeout(resolve, 700));
        }
      } catch (err) {
        console.error(err);
        setError("No se pudieron generar las tres imágenes de los líderes.");
      } finally {
        setLiderCategoriaIndex(0);
        setDescargando(false);
      }

      return;
    }

    if (tipo === "mvp") {
      if (candidatosMVP.length === 0) {
        setError("No hay candidatos MVP disponibles para descargar.");
        return;
      }

      setDescargando(true);
      setError("");

      try {
        await document.fonts.ready;

        for (let i = 0; i < candidatosMVP.length; i++) {
          setCandidatoMVPIndex(i);

          // Esperar a que React actualice la ficha
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => resolve())
            )
          );

          const elemento = arteRef.current;
          if (!elemento) continue;

          // Esperar a que carguen las fotografías
          const imagenes = Array.from(
            elemento.querySelectorAll("img")
          );

          await Promise.all(
            imagenes.map((img) => {
              if (img.complete) return Promise.resolve();

              return new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              });
            })
          );

          const esHistoria = formato === "historia";

          const png = await toPng(elemento, {
            cacheBust: true,
            pixelRatio: 3,
            width: ancho,
            height: alto,
            canvasWidth: 1080,
            canvasHeight: esHistoria ? 1920 : 1350,
            backgroundColor: "#07152e",
            style: {
              width: `${ancho}px`,
              height: `${alto}px`,
              minWidth: `${ancho}px`,
              minHeight: `${alto}px`,
              maxWidth: `${ancho}px`,
              maxHeight: `${alto}px`,
            },
          });

          const respuestaImagen = await fetch(png);
          const archivoImagen = await respuestaImagen.blob();
          const urlImagen = URL.createObjectURL(archivoImagen);

          const nombreJugador = candidatosMVP[i].nombre
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .toLowerCase();

          const enlace = document.createElement("a");
          enlace.href = urlImagen;
          enlace.download = `libavime-mvp-${i + 1}-${nombreJugador}-${formato}.png`;
          enlace.style.display = "none";

          document.body.appendChild(enlace);
          enlace.click();
          enlace.remove();

          setTimeout(() => URL.revokeObjectURL(urlImagen), 2000);

          // Pequeña pausa entre descargas
          await new Promise((resolve) => setTimeout(resolve, 700));
        }
      } catch (err) {
        console.error(err);
        setError("No se pudieron generar todas las imágenes de los candidatos MVP.");
      } finally {
        setCandidatoMVPIndex(0);
        setDescargando(false);
      }

      return;
    }
    if (tipo === "destacados") {
  setDescargando(true);
  setError("");

  try {
    await document.fonts.ready;

    for (let i = 0; i < destacadosPorEquipo.length; i++) {
      if (destacadosPorEquipo[i].jugadores.length === 0) {
        continue;
      }

      setEquipoDestacadoIndex(i);

      await new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve())
        )
      );

      const elemento = arteRef.current;
      if (!elemento) continue;

      const imagenes = Array.from(elemento.querySelectorAll("img"));

      await Promise.all(
        imagenes.map((img) => {
          if (img.complete) return Promise.resolve();

          return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        })
      );

      const esHistoria = formato === "historia";
      const anchoExportacion = 1080;
      const altoExportacion = esHistoria ? 1920 : 1350;

      const png = await toPng(elemento, {
        cacheBust: true,
        pixelRatio: 3,
        width: ancho,
        height: alto,
        canvasWidth: anchoExportacion,
        canvasHeight: altoExportacion,
        backgroundColor: "#07152e",
      });

      const respuestaImagen = await fetch(png);
const archivoImagen = await respuestaImagen.blob();
const urlImagen = URL.createObjectURL(archivoImagen);

const enlace = document.createElement("a");
enlace.href = urlImagen;
enlace.download = `libavime-${tipo}-${formato}.png`;
enlace.style.display = "none";

document.body.appendChild(enlace);
enlace.click();
enlace.remove();

setTimeout(() => URL.revokeObjectURL(urlImagen), 1000);

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (err) {
    console.error(err);
    setError("No se pudieron generar todas las imágenes de la jornada.");
  } finally {
    setEquipoDestacadoIndex(0);
    setDescargando(false);
  }

  return;
}

    setDescargando(true);
    setError("");

    try {
      await document.fonts.ready;

      const imagenes = Array.from(
        arteRef.current.querySelectorAll("img")
      );

      await Promise.all(
        imagenes.map((img) => {
          if (img.complete) return Promise.resolve();

          return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        })
      );


const esHistoria = formato === "historia";
const anchoExportacion = 1080;
const altoExportacion = esHistoria ? 1920 : 1350;

const png = await toPng(arteRef.current, {
  cacheBust: true,
  pixelRatio: 3,
  width: ancho,
  height: alto,
  canvasWidth: anchoExportacion,
  canvasHeight: altoExportacion,
  backgroundColor: "#07152e",
  style: {
    width: `${ancho}px`,
    height: `${alto}px`,
    minWidth: `${ancho}px`,
    minHeight: `${alto}px`,
    maxWidth: `${ancho}px`,
    maxHeight: `${alto}px`,
  },
});

      const enlace = document.createElement("a");
enlace.href = png;
enlace.download = `libavime-${tipo}-${formato}.png`;
enlace.style.display = "none";

document.body.appendChild(enlace);
enlace.click();
enlace.remove();
    } catch (err) {
      console.error(err);
      setError(
        "No se pudo crear la imagen. Comprueba si alguna foto externa bloquea la exportación."
      );
    } finally {
      setDescargando(false);
    }
  }


  const [publicando, setPublicando] = useState(false);
  const [mensajeGaleria, setMensajeGaleria] = useState("");

  async function guardarEnGaleria(publicar: boolean) {
    if (!arteRef.current || descargando || publicando) return;

    setPublicando(true);
    setMensajeGaleria("");
    setError("");
const tiempoInicio = performance.now();
let marca = tiempoInicio;

const medir = (paso: string) => {
  const ahora = performance.now();
  console.log(
    `[LIBAVIME] ${paso}: ${((ahora - marca) / 1000).toFixed(2)} s`
  );
  marca = ahora;
};
    try {
      await document.fonts.ready;
      medir("Fuentes listas");

      const elemento = arteRef.current;
      const imagenes = Array.from(elemento.querySelectorAll("img"));

      await Promise.all(
        imagenes.map((img) => {
          if (img.complete) return Promise.resolve();

          return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        })
      );

      const esHistoria = formato === "historia";
      const imagen = await toJpeg(elemento, {
  cacheBust: false,
  pixelRatio: 1,
  width: ancho,
  height: alto,
  canvasWidth: 1080,
  canvasHeight: esHistoria ? 1920 : 1350,
  backgroundColor: "#07152e",
  quality: 0.85,
  style: {
    width: `${ancho}px`,
    height: `${alto}px`,
    minWidth: `${ancho}px`,
    minHeight: `${alto}px`,
    maxWidth: `${ancho}px`,
    maxHeight: `${alto}px`,
  },
});
medir(`JPEG generado (${(imagen.length / 1024 / 1024).toFixed(2)} MB en Base64)`);

      const liderSeleccionado =
        tipo === "lideres" ? ganadoresPorCategoria[liderCategoriaIndex] : null;
      const etiquetaLider = liderSeleccionado?.categoria
        ? liderSeleccionado.categoria === "puntos"
          ? "Líder en puntos"
          : liderSeleccionado.categoria === "rebotes"
            ? "Líder en rebotes"
            : "Líder en asistencias"
        : "";
      const titulo = `LIBAVIME ${tipo === "finales" ? "Gran Final 1-1" : tipo} - ${esHistoria ? "Historia" : "Post"}${
        tipo === "jugador" && jugador
          ? ` - ${jugador.nombre}`
          : tipo === "lideres" && liderSeleccionado?.jugador
            ? ` - ${etiquetaLider} - ${liderSeleccionado.jugador.nombre}`
            : (tipo === "destacado_individual" || (tipo === "destacados" && modoIndividualDestacado))
              ? ` - Jornada ${fechaJornada} - ${destacadoIndividual?.nombre ?? "Jugador destacado"}`
              : ""
      }`;

      const respuesta = await fetch("/api/disenos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  titulo: titulo.slice(0, 120),
  tipo: formato,
  imagen: imagen,
  jugador:
    tipo === "jugador" && jugador
      ? jugador.nombre
      : tipo === "lideres"
        ? liderSeleccionado?.jugador?.nombre ?? null
        : (tipo === "destacado_individual" || (tipo === "destacados" && modoIndividualDestacado))
          ? destacadoIndividual?.nombre ?? null
          : null,
  categoria:
    tipo === "lideres" && liderSeleccionado?.categoria
      ? `lider-${liderSeleccionado.categoria}`
      : tipo,
  jornada: fechaJornada || null,
  publicado: publicar,
}),
      });
      medir(`Respuesta del servidor: HTTP ${respuesta.status}`);
console.log(
  `[LIBAVIME] Tiempo total hasta respuesta: ${(
    (performance.now() - tiempoInicio) / 1000
  ).toFixed(2)} s`
);

      const contenido = await respuesta.text();

let resultado: { error?: string } = {};

try {
  resultado = contenido ? JSON.parse(contenido) : {};
} catch {
  console.error(
    "Respuesta no válida de /api/disenos:",
    respuesta.status,
    contenido.slice(0, 500)
  );

  throw new Error(
    `El servidor devolvió una respuesta no válida (HTTP ${respuesta.status}). Revisa los registros de Vercel.`
  );
}

if (!respuesta.ok) {
  throw new Error(
    resultado.error || `No se pudo publicar el diseño (HTTP ${respuesta.status}).`
  );
}
      setMensajeGaleria("¡Diseño publicado correctamente en la galería de LIBAVIME!");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo publicar el diseño en la galería."
      );
    } finally {
      setPublicando(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-red-600">
            LIBAVIME 2026
          </p>
          <h1 className="mt-2 text-3xl font-black text-blue-950 md:text-4xl">
            Generador de contenido para Instagram
          </h1>
          <p className="mt-2 text-slate-600">
            Crea diseños con fotos y estadísticas de Supabase.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-5 rounded-3xl bg-white p-5 shadow-sm md:p-6">
            <div>
              <label className="mb-2 block text-sm font-bold">
                Tipo de publicación
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
  ["jugador", "Jugador"],
  ["lideres", "Líderes"],
  ["posiciones", "Posiciones"],
  ["destacados", "Destacados de la jornada"],
  ["destacado_individual", "Destacado de la jornada individual"],
  ["mvp", "Candidatos MVP"],
  ["finales", "Finales"],
] as [Tipo, string][]).map(([valor, texto]) => (
                  <button
                    key={valor}
                    onClick={() => {
                      setTipo(valor);
                      setModoIndividualDestacado(valor === "destacado_individual");
                    }}
                    className={`rounded-xl border px-2 py-3 text-sm font-bold ${
                      tipo === valor
                        ? "border-red-600 bg-red-50 text-red-700"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {texto}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">
                Formato
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFormato("historia")}
                  className={`rounded-xl border p-3 text-left ${
                    formato === "historia"
                      ? "border-blue-900 bg-blue-50"
                      : "border-slate-200"
                  }`}
                >
                  <span className="block font-black">Historia</span>
                  <span className="text-sm text-slate-600">
                    1080 × 1920 · 9:16
                  </span>
                </button>

                <button
                  onClick={() => setFormato("post")}
                  className={`rounded-xl border p-3 text-left ${
                    formato === "post"
                      ? "border-blue-900 bg-blue-50"
                      : "border-slate-200"
                  }`}
                >
                  <span className="block font-black">Post</span>
                  <span className="text-sm text-slate-600">
                    1080 × 1350 · 4:5
                  </span>
                </button>
              </div>
            </div>

{tipo === "jugador" && (
  <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
    <h3 className="font-black text-blue-950">
      Editor de fotos del jugador
    </h3>

    <p className="text-sm text-slate-600">
      Ajusta la posición y el zoom de la foto. Los valores se guardan
      por separado para Post e Historia.
    </p>

    <label className="block text-sm font-bold">
      Seleccionar jugador
    </label>

    <select
      value={jugadorIndividualEncuadreId}
      onChange={(e) =>
        setJugadorIndividualEncuadreId(e.target.value)
      }
      className="w-full rounded-xl border border-slate-300 bg-white p-3"
    >
      <option value="">Selecciona un jugador</option>
      {jugadores.map((j) => (
        <option key={j.id} value={String(j.id)}>
          {j.nombre} — {j.equipo || "LIBAVIME"}
        </option>
      ))}
    </select>

    {jugadorIndividualEncuadreId && (() => {
      const guardado =
        encuadres[jugadorIndividualEncuadreId];

      const ajuste =
        guardado?.[formato] ?? {
          x: guardado?.x ?? 0,
          y: guardado?.y ?? 0,
          zoom: guardado?.zoom ?? 1,
        };

      function actualizarAjuste(
        campo: "x" | "y" | "zoom",
        valor: number
      ) {
        setEncuadres((actual) => {
          const anterior =
            actual[jugadorIndividualEncuadreId] ?? {
              x: 0,
              y: 0,
              zoom: 1,
            };

          const anteriorFormato =
            anterior[formato] ?? {
              x: anterior.x ?? 0,
              y: anterior.y ?? 0,
              zoom: anterior.zoom ?? 1,
            };

          return {
            ...actual,
            [jugadorIndividualEncuadreId]: {
              ...anterior,
              [formato]: {
                ...anteriorFormato,
                [campo]: valor,
              },
            },
          };
        });
      }

      return (
        <>
          <label className="block text-sm font-bold">
            Horizontal: {ajuste.x}
          </label>
          <input
            type="range"
            min="-80"
            max="80"
            value={ajuste.x}
            onChange={(e) =>
              actualizarAjuste("x", Number(e.target.value))
            }
            className="w-full"
          />

          <label className="block text-sm font-bold">
            Vertical: {ajuste.y}
          </label>
          <input
            type="range"
            min="-400"
            max="400"
            value={ajuste.y}
            onChange={(e) =>
              actualizarAjuste("y", Number(e.target.value))
            }
            className="w-full"
          />

          <label className="block text-sm font-bold">
            Zoom: {ajuste.zoom.toFixed(2)}×
          </label>
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.05"
            value={ajuste.zoom}
            onChange={(e) =>
              actualizarAjuste("zoom", Number(e.target.value))
            }
            className="w-full"
          />

          <button
            type="button"
            disabled={guardandoEncuadre}
            onClick={async () => {
              setGuardandoEncuadre(true);

              try {
                const respuesta = await fetch("/api/encuadres", {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    jugadores: encuadres,
                  }),
                });

                if (!respuesta.ok) {
                  throw new Error("No se pudo guardar");
                }

                alert("Encuadre del jugador guardado correctamente.");
              } catch (error) {
                console.error(error);
                alert("No se pudo guardar el encuadre.");
              } finally {
                setGuardandoEncuadre(false);
              }
            }}
            className="w-full rounded-xl bg-blue-950 px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            {guardandoEncuadre
              ? "Guardando..."
              : "Guardar encuadre del jugador"}
          </button>

          <p className="text-xs text-slate-500">
            Formato actual: {formato === "post" ? "Post" : "Historia"}.
          </p>
        </>
      );
    })()}
  </div>
)}


{tipo === "lideres" && (
  <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
    <h3 className="font-black text-blue-950">Editor de fotografías de los ganadores</h3>
    <p className="text-sm text-slate-600">
      Ajusta el encuadre de cada ganador. Los cambios se guardan por separado para Post e Historia.
    </p>

    <label className="block text-sm font-bold">Seleccionar jugador</label>
    <select
      value={liderEncuadreId}
      onChange={(e) => setLiderEncuadreId(e.target.value)}
      className="w-full rounded-xl border border-slate-300 bg-white p-3"
    >
      <option value="">Selecciona un líder</option>
      {lideres.map((j) => (
        <option key={j.id} value={`lider-${j.id}`}>
          {j.nombre} — {j.equipo || "LIBAVIME"}
        </option>
      ))}
    </select>

    {liderEncuadreId && (() => {
      const guardado = encuadres[liderEncuadreId];
      const ajuste = formato === "post"
        ? guardado?.post ?? { x: guardado?.x ?? 0, y: guardado?.y ?? 0, zoom: guardado?.zoom ?? 1 }
        : guardado?.historia ?? { x: guardado?.x ?? 0, y: guardado?.y ?? 0, zoom: guardado?.zoom ?? 1 };

      const actualizar = (campo: "x" | "y" | "zoom", valor: number) => {
        setEncuadres((actual) => {
          const anterior = actual[liderEncuadreId] ?? { x: 0, y: 0, zoom: 1 };
          const anteriorFormato = formato === "post"
            ? anterior.post ?? { x: anterior.x ?? 0, y: anterior.y ?? 0, zoom: anterior.zoom ?? 1 }
            : anterior.historia ?? { x: anterior.x ?? 0, y: anterior.y ?? 0, zoom: anterior.zoom ?? 1 };

          return {
            ...actual,
            [liderEncuadreId]: {
              ...anterior,
              [formato]: { ...anteriorFormato, [campo]: valor },
            },
          };
        });
      };

      return (
        <div className="space-y-3">
          <label className="block text-sm font-bold">Horizontal: {ajuste.x}</label>
          <input type="range" min="-80" max="80" value={ajuste.x}
            onChange={(e) => actualizar("x", Number(e.target.value))}
            className="w-full" />

          <label className="block text-sm font-bold">Vertical: {ajuste.y}</label>
          <input type="range" min="-100" max="100" value={ajuste.y}
            onChange={(e) => actualizar("y", Number(e.target.value))}
            className="w-full" />

          <label className="block text-sm font-bold">Zoom: {ajuste.zoom.toFixed(2)}×</label>
          <input type="range" min="0.5" max="4" step="0.05" value={ajuste.zoom}
            onChange={(e) => actualizar("zoom", Number(e.target.value))}
            className="w-full" />

          <button type="button" disabled={guardandoEncuadre}
            onClick={async () => {
              setGuardandoEncuadre(true);
              try {
                const respuesta = await fetch("/api/encuadres", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ jugadores: encuadres }),
                });
                if (!respuesta.ok) throw new Error("No se pudo guardar");
                alert("Encuadre del líder guardado correctamente.");
              } catch (error) {
                console.error(error);
                alert("No se pudo guardar el encuadre.");
              } finally {
                setGuardandoEncuadre(false);
              }
            }}
            className="w-full rounded-xl bg-blue-950 px-4 py-3 font-bold text-white disabled:opacity-50">
            {guardandoEncuadre ? "Guardando..." : "Guardar encuadre del líder"}
          </button>
        </div>
      );
    })()}
  </div>
)}

{(tipo === "destacados" || tipo === "destacado_individual") && (
  <div>
    <label className="mb-2 block text-sm font-medium text-slate-700">
      Seleccionar jornada
    </label>

    <select
      value={fechaJornada}
      onChange={(e) => setFechaJornada(e.target.value)}
      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
    >
      {fechasJornada.map((fecha) => (
        <option key={fecha} value={fecha}>
          {fecha.split("-").reverse().join("/")}
        </option>
      ))}
    </select>
  </div>
)}


{tipo === "destacado_individual" && (
  <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
    <h3 className="font-black text-blue-950">
      Editor de destacado individual
    </h3>
    <p className="text-sm text-slate-600">Arrastra la foto directamente en la vista previa o utiliza estos controles para ajustarla y centrarla. Los cambios se guardan para el formato seleccionado.</p>

    <div>
      <label className="mb-2 block text-sm font-bold">
        Seleccionar jugador
      </label>

      <select
        value={jugadorEncuadreId}
        onChange={(e) => {
  const id = e.target.value;

  setJugadorEncuadreId(id);

  const seleccionado = destacadosJornada.find(
    (j: any) => String(j.id) === id
  );

  if (seleccionado) {
    const indice = NOMBRES_EQUIPOS.findIndex(
      (equipo) =>
        normalizar(equipo) === normalizar(seleccionado.equipo)
    );

    if (indice >= 0) {
      setEquipoDestacadoIndex(indice);
    }
  }
}}
        className="w-full rounded-xl border border-slate-300 bg-white p-3"
      >
        <option value="">Selecciona un jugador</option>

        {destacadosJornada.map((j: any) => (
          <option key={j.id} value={String(j.id)}>
            {j.nombre} — {j.equipo}
          </option>
        ))}
      </select>
    </div>

    {jugadorEncuadreId && (() => {
      const guardado = encuadres[jugadorEncuadreId];

      const ajuste = formato === "post"
        ? guardado?.post ?? {
            x: guardado?.x ?? 0,
            y: guardado?.y ?? 0,
            zoom: guardado?.zoom ?? 1,
          }
        : guardado?.historia ?? {
            x: guardado?.x ?? 0,
            y: guardado?.y ?? 0,
            zoom: guardado?.zoom ?? 1,
          };

      const actualizar = (
        campo: "x" | "y" | "zoom",
        valor: number
      ) => {
        setEncuadres((actual) => {
          const anterior = actual[jugadorEncuadreId] ?? {
            x: 0,
            y: 0,
            zoom: 1,
          };

          const ajusteActual = formato === "post"
            ? anterior.post ?? {
                x: anterior.x ?? 0,
                y: anterior.y ?? 0,
                zoom: anterior.zoom ?? 1,
              }
            : anterior.historia ?? {
                x: anterior.x ?? 0,
                y: anterior.y ?? 0,
                zoom: anterior.zoom ?? 1,
              };

          const nuevoAjuste = {
            ...ajusteActual,
            [campo]: valor,
          };

          return {
            ...actual,
            [jugadorEncuadreId]: {
              ...anterior,
              [formato]: nuevoAjuste,
            },
          };
        });
      };

      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold">
              Horizontal: {ajuste.x}
            </label>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={ajuste.x}
              onChange={(e) => actualizar("x", Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-bold">
              Vertical: {ajuste.y}
            </label>
            <input
              type="range"
              min="-260"
              max="260"
              step="1"
              value={ajuste.y}
              onChange={(e) => actualizar("y", Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-bold">
              Zoom: {ajuste.zoom.toFixed(2)}×
            </label>
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.05"
              value={ajuste.zoom}
              onChange={(e) => actualizar("zoom", Number(e.target.value))}
              className="w-full"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              actualizar("x", 0);
              actualizar("y", 0);
            }}
            className="w-full rounded-xl border border-blue-950 bg-white px-4 py-3 font-bold text-blue-950 hover:bg-blue-50"
          >
            🎯 Centrar foto
          </button>

          <button
            type="button"
            disabled={guardandoEncuadre}
            onClick={async () => {
              setGuardandoEncuadre(true);

              try {
                const respuesta = await fetch("/api/encuadres", {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    jugadores: encuadres,
                  }),
                });

                if (!respuesta.ok) {
                  throw new Error("Error al guardar");
                }

                alert("Encuadre guardado correctamente.");
              } catch (error) {
                console.error(error);
                alert("No se pudo guardar el encuadre.");
              } finally {
                setGuardandoEncuadre(false);
              }
            }}
            className="w-full rounded-xl bg-blue-950 px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            {guardandoEncuadre ? "Guardando..." : "Guardar encuadre"}
          </button>

          <p className="text-xs text-slate-500">
            Ajustes independientes para el formato seleccionado:
            {formato === "post" ? " Post." : " Historia."}
          </p>
        </div>
      );
    })()}
  </div>
)}



{tipo === "destacados" && !modoIndividualDestacado && (
  <div className="space-y-4 rounded-xl border border-slate-200 p-4">
    <h3 className="font-black text-blue-950">
      Editor individual de jugadores
    </h3>

    <label className="block text-sm font-bold">
      Seleccionar jugador
    </label>

    <select
      value={jugadorEncuadreId}
      onChange={(e) => {
  const id = e.target.value;

  setJugadorEncuadreId(id);

  const seleccionado = destacadosJornada.find(
    (j: any) => String(j.id) === id
  );

  if (seleccionado) {
    const indice = NOMBRES_EQUIPOS.findIndex(
      (equipo) =>
        normalizar(equipo) === normalizar(seleccionado.equipo)
    );

    if (indice >= 0) {
      setEquipoDestacadoIndex(indice);
    }
  }
}}
      className="w-full rounded-xl border border-slate-300 bg-white p-3"
    >
      <option value="">Selecciona un jugador</option>
      {destacadosJornada.map((j: any) => (
        <option key={j.id} value={String(j.id)}>
          {j.nombre} — {j.equipo}
        </option>
      ))}
    </select>

    {(() => {
      const ajuste =
        encuadres[jugadorEncuadreId]?.[formato] ??
        { x: 0, y: 0, zoom: 1 };

      function actualizarAjuste(
        campo: "x" | "y" | "zoom",
        valor: number
      ) {
        setEncuadres((actual) => {
          const anterior = actual[jugadorEncuadreId] ?? {
            x: 0, y: 0, zoom: 1,
          };
          const anteriorFormato = anterior[formato] ?? {
            x: anterior.x ?? 0,
            y: anterior.y ?? 0,
            zoom: anterior.zoom ?? 1,
          };

          return {
            ...actual,
            [jugadorEncuadreId]: {
              ...anterior,
              [formato]: {
                ...anteriorFormato,
                [campo]: valor,
              },
            },
          };
        });
      }

      return jugadorEncuadreId ? (
        <>
          <label className="block text-sm font-bold">
            Horizontal: {ajuste.x}
          </label>
          <input
            type="range"
            min="-80"
            max="80"
            value={ajuste.x}
            onChange={(e) =>
              actualizarAjuste("x", Number(e.target.value))
            }
            className="w-full"
          />

          <label className="block text-sm font-bold">
            Vertical: {ajuste.y}
          </label>
          <input
            type="range"
            min="-400"
            max="400"
            value={ajuste.y}
            onChange={(e) =>
              actualizarAjuste("y", Number(e.target.value))
            }
            className="w-full"
          />

          <label className="block text-sm font-bold">
            Zoom: {ajuste.zoom.toFixed(2)}×
          </label>
          <input
            type="range"
            min="0.5"
            max="4"
            step="0.05"
            value={ajuste.zoom}
            onChange={(e) =>
              actualizarAjuste("zoom", Number(e.target.value))
            }
            className="w-full"
          />

          <button
            type="button"
            disabled={guardandoEncuadre}
            onClick={async () => {
              setGuardandoEncuadre(true);
              try {
                const respuesta = await fetch("/api/encuadres", {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ jugadores: encuadres }),
                });

                if (!respuesta.ok) {
                  throw new Error("No se pudo guardar");
                }

                alert("Encuadre guardado correctamente.");
              } catch (error) {
                console.error(error);
                alert("No se pudo guardar el encuadre.");
              } finally {
                setGuardandoEncuadre(false);
              }
            }}
            className="w-full rounded-xl bg-blue-950 px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            {guardandoEncuadre ? "Guardando..." : "Guardar encuadre"}
          </button>
        </>
      ) : (
        <p className="text-sm text-slate-500">
          Selecciona un jugador para editar su foto.
        </p>
      );
    })()}
  </div>
)}


            {tipo === "jugador" && (
              <div>
                <label className="mb-2 block text-sm font-bold">
                  Seleccionar jugador
                </label>
                <select
                  value={jugadorId}
                  onChange={(e) => setJugadorId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3"
                >
                  {jugadores.map((j) => (
                    <option key={j.id} value={String(j.id)}>
                      {j.nombre}
                      {j.equipo ? ` — ${j.equipo}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

                        {tipo === "mvp" && candidatosMVP[candidatoMVPIndex] && (() => {
  const candidato = candidatosMVP[candidatoMVPIndex];
  const claveEncuadre = `mvp-${candidato.id}`;
  const guardado = encuadres[claveEncuadre];

  const ajuste = guardado?.[formato] ?? {
    x: guardado?.x ?? 0,
    y: guardado?.y ?? 0,
    zoom: guardado?.zoom ?? 1,
  };

  const actualizarAjuste = (
    campo: "x" | "y" | "zoom",
    valor: number
  ) => {
    setEncuadres((actual) => {
      const anterior = actual[claveEncuadre] ?? {
        x: 0,
        y: 0,
        zoom: 1,
      };

      const anteriorFormato = anterior[formato] ?? {
        x: anterior.x ?? 0,
        y: anterior.y ?? 0,
        zoom: anterior.zoom ?? 1,
      };

      return {
        ...actual,
        [claveEncuadre]: {
          ...anterior,
          [formato]: {
            ...anteriorFormato,
            [campo]: valor,
          },
        },
      };
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <h3 className="font-black text-blue-950">
        Editor de fotografía del candidato MVP
      </h3>

      <p className="text-sm text-slate-600">
        Ajusta la fotografía de {candidato.nombre}.
        Los cambios se guardan por separado para Post e Historia.
      </p>

      <div>
        <label className="block text-sm font-bold">
          Posición horizontal: {ajuste.x}
        </label>
        <input
          type="range"
          min="-100"
          max="100"
          value={ajuste.x}
          onChange={(e) =>
            actualizarAjuste("x", Number(e.target.value))
          }
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-bold">
          Posición vertical: {ajuste.y}
        </label>
        <input
          type="range"
          min="-400"
          max="400"
          value={ajuste.y}
          onChange={(e) =>
            actualizarAjuste("y", Number(e.target.value))
          }
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-bold">
          Zoom: {ajuste.zoom.toFixed(2)}×
        </label>
        <input
          type="range"
          min="0.5"
          max="4"
          step="0.05"
          value={ajuste.zoom}
          onChange={(e) =>
            actualizarAjuste("zoom", Number(e.target.value))
          }
          className="w-full"
        />
      </div>

      <button
        type="button"
        disabled={guardandoEncuadre}
        onClick={async () => {
          setGuardandoEncuadre(true);

          try {
            const respuesta = await fetch("/api/encuadres", {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                jugadores: encuadres,
              }),
            });

            if (!respuesta.ok) {
              throw new Error("No se pudo guardar el encuadre");
            }

            alert("Encuadre del candidato MVP guardado correctamente.");
          } catch (error) {
            console.error(error);
            alert("No se pudo guardar el encuadre.");
          } finally {
            setGuardandoEncuadre(false);
          }
        }}
        className="w-full rounded-xl bg-blue-950 px-4 py-3 font-bold text-white disabled:opacity-50"
      >
        {guardandoEncuadre
          ? "Guardando..."
          : "Guardar encuadre MVP"}
      </button>

      <p className="text-xs text-slate-500">
        Formato actual: {formato === "post" ? "Post" : "Historia"}.
      </p>
    </div>
  );
})()}

            {tipo === "lideres" && (
  <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
    <h3 className="font-black text-blue-950">Seleccionar líder estadístico</h3>
    <p className="text-sm text-slate-600">
      Imagen {liderCategoriaIndex + 1} de 3 · Cada categoría se descarga como un PNG independiente.
    </p>

    <select
      value={liderCategoriaIndex}
      onChange={(e) => setLiderCategoriaIndex(Number(e.target.value))}
      className="w-full rounded-xl border border-slate-300 bg-white p-3"
    >
      {ganadoresPorCategoria.map(({ categoria: clave, jugador: ganador }, index) => {
        const etiqueta = clave === "puntos"
          ? "Líder en puntos"
          : clave === "rebotes"
            ? "Líder en rebotes"
            : "Líder en asistencias";
        return (
          <option key={clave} value={index}>
            {etiqueta} — {ganador?.nombre ?? "Sin ganador"}
          </option>
        );
      })}
    </select>

    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => setLiderCategoriaIndex((actual) => Math.max(0, actual - 1))}
        disabled={liderCategoriaIndex === 0}
        className="rounded-xl bg-blue-950 px-3 py-3 font-bold text-white disabled:opacity-40"
      >
        ← Anterior
      </button>
      <button
        type="button"
        onClick={() => setLiderCategoriaIndex((actual) => Math.min(ganadoresPorCategoria.length - 1, actual + 1))}
        disabled={liderCategoriaIndex >= ganadoresPorCategoria.length - 1}
        className="rounded-xl bg-red-600 px-3 py-3 font-bold text-white disabled:opacity-40"
      >
        Siguiente →
      </button>
    </div>
  </div>
)}

{tipo === "mvp" && (
  <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
    <h3 className="font-black text-blue-950">
      Seleccionar candidato MVP
    </h3>

    <p className="text-sm text-slate-600">
      Candidato {candidatosMVP.length > 0 ? candidatoMVPIndex + 1 : 0}
      {" "}de {candidatosMVP.length}
    </p>

    <select
      value={candidatoMVPIndex}
      onChange={(e) =>
        setCandidatoMVPIndex(Number(e.target.value))
      }
      className="w-full rounded-xl border border-slate-300 bg-white p-3"
      disabled={candidatosMVP.length === 0}
    >
      {candidatosMVP.map((candidato, index) => (
        <option key={candidato.id} value={index}>
          {index + 1}. {candidato.nombre} — {candidato.equipo}
        </option>
      ))}
    </select>

    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() =>
          setCandidatoMVPIndex((actual) =>
            Math.max(0, actual - 1)
          )
        }
        disabled={candidatoMVPIndex === 0 || candidatosMVP.length === 0}
        className="rounded-xl bg-blue-950 px-3 py-3 font-bold text-white disabled:opacity-40"
      >
        ← Anterior
      </button>

      <button
        type="button"
        onClick={() =>
          setCandidatoMVPIndex((actual) =>
            Math.min(candidatosMVP.length - 1, actual + 1)
          )
        }
        disabled={
          candidatoMVPIndex >= candidatosMVP.length - 1 ||
          candidatosMVP.length === 0
        }
        className="rounded-xl bg-red-600 px-3 py-3 font-bold text-white disabled:opacity-40"
      >
        Siguiente →
      </button>
    </div>

    {candidatosMVP.length === 0 && (
      <p className="text-sm font-bold text-red-600">
        No hay candidatos MVP elegibles con los datos actuales.
      </p>
    )}
  </div>
)}

            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              {cargando
                ? "Cargando datos de Supabase…"
                : `${jugadores.length} jugadores y ${equipos.length} equipos cargados.`}
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              onClick={descargar}
             disabled={
  cargando ||
  descargando ||
  (tipo === "jugador" && !jugador) ||
  (tipo === "mvp" && candidatosMVP.length === 0) ||
  (tipo === "lideres" && !ganadoresPorCategoria.some(({ jugador }) => jugador)) ||
  (tipo === "destacado_individual" && !destacadoIndividual)
}

              className="w-full rounded-xl bg-red-600 px-5 py-4 font-black text-white shadow-lg hover:bg-red-700 disabled:opacity-50"
            >
              {descargando
                ? tipo === "lideres" ? "Generando 3 imágenes…" : "Generando imagen…"
                : tipo === "lideres"
                  ? `Descargar 3 imágenes ${formato === "historia" ? "Historia" : "Post"} PNG`
                  : `Descargar ${formato === "historia" ? "Historia" : "Post"} PNG`}
            </button>


<button
  type="button"
  onClick={() => guardarEnGaleria(false)}
  disabled={cargando || descargando || publicando || (tipo === "jugador" && !jugador) || (tipo === "destacado_individual" && !destacadoIndividual)}
  className="mt-3 w-full rounded-xl bg-emerald-700 px-5 py-4 font-black text-white shadow-lg hover:bg-emerald-800 disabled:opacity-50"
>
  {publicando ? "Guardando diseño…" : "Guardar diseño"}
</button>

<button
  type="button"
  onClick={() => guardarEnGaleria(true)}
  disabled={cargando || descargando || publicando || (tipo === "jugador" && !jugador) || (tipo === "destacado_individual" && !destacadoIndividual)}
  className="mt-3 w-full rounded-xl bg-blue-950 px-5 py-4 font-black text-white shadow-lg hover:bg-blue-900 disabled:opacity-50"
>
  {publicando ? "Publicando diseño…" : "Publicar en la galería"}
</button>


            {mensajeGaleria && (
              <p role="status" className="mt-3 rounded-xl bg-green-50 p-3 text-sm font-bold text-green-800">
                {mensajeGaleria}
              </p>
            )}
          </div>

          <div className="flex flex-col items-center rounded-3xl bg-slate-200 p-4">
            <div className="mb-3 flex w-full justify-between">
              <h2 className="font-black text-blue-950">Vista previa</h2>
              <span className="text-xs font-bold text-slate-500">
                {formato === "historia" ? "9:16" : "4:5"}
              </span>
            </div>

            <div className="w-full overflow-x-auto pb-2">
              <div
                ref={arteRef}
               style={{
  width: ancho,
  height: alto,
  fontFamily: "Arial, Helvetica, sans-serif",
  backgroundImage: `
    linear-gradient(rgba(2,6,23,0.20), rgba(2,6,23,0.30)),
    url("/backgrounds/arena-mvp.png")
  `,
  backgroundSize: "cover",
  backgroundPosition: "center center",
  backgroundRepeat: "no-repeat",
}}
                className={`relative mx-auto flex shrink-0 flex-col overflow-hidden bg-[#07152e] text-white ${
  formato === "post" ? "p-4" : "p-2"
}`}
              >
  {/* Humo y focos cinematográficos */}
<div
  className="pointer-events-none absolute inset-0"
  style={{
    background: `
      radial-gradient(ellipse at 10% 12%, rgba(147,197,253,0.35), transparent 18%),
      radial-gradient(ellipse at 90% 14%, rgba(248,113,113,0.32), transparent 20%),
      radial-gradient(ellipse at 50% 25%, rgba(226,232,240,0.18), transparent 30%),
      radial-gradient(ellipse at 15% 48%, rgba(59,130,246,0.18), transparent 25%),
      radial-gradient(ellipse at 85% 48%, rgba(239,68,68,0.18), transparent 25%)
    `,
    filter: "blur(22px)",
    transform: "scale(1.05)",
  }}
/>
{/* Líneas de luz deportivas */}
{/* Fondo cinematográfico: arena de playoffs */}
{/* Haces de luz cinematográficos */}
{/* Arena realista LIBAVIME */}
<div
  className={`pointer-events-none absolute inset-0 ${
  tipo === "mvp" ? "hidden" : ""
}`}
  style={{
    backgroundImage:
  tipo === "mvp"
    ? `
        radial-gradient(ellipse at 50% 8%, rgba(255,215,90,0.30), transparent 38%),
        radial-gradient(ellipse at 90% 45%, rgba(245,158,11,0.16), transparent 35%),
        radial-gradient(ellipse at 5% 85%, rgba(220,38,38,0.22), transparent 38%),
        linear-gradient(115deg, transparent 35%, rgba(255,215,90,0.08) 50%, transparent 65%),
        linear-gradient(145deg, #030712 0%, #101c35 42%, #172b4d 68%, #030712 100%)
      `
    : `
        linear-gradient(
          180deg,
          rgba(3,7,18,0.25) 0%,
          rgba(3,7,18,0.30) 40%,
          rgba(3,7,18,0.88) 100%
        ),
        url("/backgrounds/arena-libavime.png")
      `,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  }}
/>



<header className="relative -mt-5 flex shrink-0 items-center justify-center gap-0 border-b-2 border-red-600/70 pb-2">
  <img
    src={LOGO}
    alt="Logo LIBAVIME"
    className="h-16 w-16 shrink-0 object-contain"
  />

  <div className="text-left">
    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-300">
      LIGA DE BALONCESTO
    </p>

    <h1 className="text-2xl font-black italic leading-none tracking-tight text-white">
  LIBAVIME <span className="text-red-500">2026</span>
</h1>

    <div className="mt-1 h-1 w-full rounded-full bg-red-600" />
  </div>
</header>





{tipo === "jugador" && jugador && (
  <div className="relative z-10 flex flex-col">
    <p
      className={`mt-1 text-center font-black tracking-[0.2em] text-red-400 ${
        formato === "post" ? "text-[10px]" : "text-xs"
      }`}
    >
      JUGADOR DESTACADO
    </p>


    <h2
      className={`mt-0 text-center font-black uppercase leading-tight ${
        formato === "post" ? "text-2xl" : "text-3xl"
      }`}
    >
      {jugador.nombre}
    </h2>

    <p className="mt-0 text-center text-sm font-bold text-slate-300">
      {jugador.equipo || "LIBAVIME"}
    </p>



<div
  className={`relative mx-auto mt-1 w-full shrink-0 overflow-hidden rounded-[20px] bg-transparent ${
    formato === "post" ? "h-[100px]" : "h-[220px]"
  }`}
>



{obtenerRutaFotoInstagram(jugador.nombre) ? (

<img
  src={obtenerRutaFotoInstagram(jugador.nombre)}
  alt={jugador.nombre}
  onError={(e) => {
    console.error(
      "No se encontró la foto recortada:",
      jugador.nombre,
      e.currentTarget.src
    );
  }}
  style={{
    display: "block",
    position: "absolute",
    width: `${zoomBase * encuadreJugador.zoom}%`,
    height: "auto",
    maxWidth: "none",
    left: `calc(50% + ${encuadreJugador.x}%)`,
    top: `calc(80% + ${encuadreJugador.y}%)`,
    transform: "translate(-50%, -50%)",
    transformOrigin: "center center",
    filter: "contrast(1.08) saturate(1.08)",
  }}
/>

) : (
  <div className="flex h-full items-center justify-center p-3 text-center text-white">
    No hay una foto válida registrada para este jugador.
  </div>
)}

    </div>

    <div
      className={`relative shrink-0 bg-[#0b1b36] ${
        formato === "post" ? "mt-0 px-1 py-1" : "mt-0 px-3 pb-3 pt-4"
      }`}
    >

<p
  className={`mb-1 text-center font-black tracking-widest text-red-400 ${
    formato === "post" ? "text-[9px]" : "text-xs"
  }`}
>
  ESTADÍSTICAS OFICIALES
</p>

<div className={`grid grid-cols-3 ${formato === "post" ? "gap-1" : "gap-2"}`}>
  {[
    ["PTS", jugador.puntos],
    ["REB", jugador.rebotes],
    ["AST", jugador.asistencias],
  ].map(([label, valor]) => (
    <div
      key={String(label)}
      className={`rounded-xl border border-white/10 bg-white/10 text-center ${
        formato === "post" ? "p-1" : "p-2"
      }`}
    >
      <p className="text-xs font-bold text-slate-300">{label}</p>
      <p
        className={`font-black text-white ${
          formato === "post" ? "text-lg leading-tight" : "text-2xl"
        }`}
      >
        {valor}
      </p>
    </div>
  ))}
</div>

<p
  className={`text-center font-bold text-slate-300 ${
    formato === "post" ? "mt-1 text-[10px]" : "mt-2 text-xs"
  }`}
>
  PARTIDOS JUGADOS: {jugador.pj}
</p>
    </div>
  </div>
)}

                {tipo === "lideres" && (() => {
                  const seleccion = ganadoresPorCategoria[liderCategoriaIndex];
                  const ganador = seleccion?.jugador;
                  if (!seleccion || !ganador) {
                    return (
                      <div className="relative z-10 flex flex-1 items-center justify-center text-center text-sm font-bold text-slate-300">
                        No hay estadísticas registradas para esta categoría.
                      </div>
                    );
                  }

                  const clave = seleccion.categoria;
                  // Un mismo dorado institucional para los tres reconocimientos.
                  const colorDorado = "#D4AF37";
                  const brilloDorado = "rgba(212,175,55,0.28)";
                  const configuracion =
                    clave === "puntos"
                      ? {
                          titulo: "LÍDER EN PUNTOS",
                          sigla: "PTS",
                          icono: "🏀",
                          color: colorDorado,
                          brillo: brilloDorado,
                        }
                      : clave === "rebotes"
                        ? {
                            titulo: "LÍDER EN REBOTES",
                            sigla: "REB",
                            icono: "💪",
                            color: colorDorado,
                            brillo: brilloDorado,
                          }
                        : {
                            titulo: "LÍDER EN ASISTENCIAS",
                            sigla: "AST",
                            icono: "🎯",
                            color: colorDorado,
                            brillo: brilloDorado,
                          };

                  const claveEncuadre = `lider-${ganador.id}`;
                  const guardado = encuadres[claveEncuadre];
                  const ajusteFoto = guardado?.[formato] ?? {
                    x: guardado?.x ?? 0,
                    y: guardado?.y ?? 0,
                    zoom: guardado?.zoom ?? 1,
                  };
                  const foto = obtenerRutaFotoInstagram(ganador.nombre);

                  return (
                    <div className="relative z-10 -mt-1 flex min-h-0 flex-1 flex-col items-center gap-0">
                      <p className={`text-center font-black tracking-[0.22em] text-red-400 ${
                        formato === "post" ? "mt-1 text-[9px]" : "mt-3 text-xs"
                      }`}>
                        RECONOCIMIENTO OFICIAL · TEMPORADA 2026
                      </p>

                      <h2
                        className={`mt-1 text-center font-black uppercase leading-tight tracking-[0.12em] ${
                          formato === "post" ? "text-xl" : "text-3xl"
                        }`}
                        style={{ color: configuracion.color, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
                      >
                        {configuracion.titulo}
                      </h2>

                      <h3 className={`mt-1 w-full px-1 text-center font-black uppercase leading-tight tracking-wide text-white ${
                        formato === "post" ? "text-[19px]" : "text-[29px]"
                      }`}>
                        {ganador.nombre}
                      </h3>

                      <div
                        className="mx-auto mt-1 mb-2 inline-flex items-center justify-center rounded-full border px-5 py-1 shadow-lg"
                        style={{ borderColor: `${configuracion.color}99`, background: "linear-gradient(90deg, #172b4d, #263957, #172b4d)" }}
                      >
                        <p className="text-center text-[10px] font-black uppercase tracking-[0.22em] text-slate-100">
                          {ganador.equipo || "LIBAVIME"}
                        </p>
                      </div>

                      <div
                        className={`relative mx-auto w-full shrink-0 overflow-hidden rounded-2xl border-2 bg-[#101d38] shadow-[0_0_25px_rgba(0,0,0,0.4)] ${
                          formato === "post" ? "h-[125px]" : "h-[225px]"
                        }`}
                        style={{
  border: "4px solid transparent",
  background: `
    linear-gradient(#101d38, #101d38) padding-box,
    linear-gradient(
      135deg,
      #704900 0%,
      #B8860B 12%,
      #FFF2A6 25%,
      #D4AF37 40%,
      #FFF8CE 50%,
      #A87908 65%,
      #F5D263 80%,
      #704900 92%,
      #FFE58A 100%
    ) border-box
  `,
  boxShadow:
    "0 0 30px rgba(212,175,55,0.75), inset 0 0 12px rgba(255,215,90,0.2)"
}}
                      >
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `linear-gradient(rgba(2,6,23,0.08), rgba(2,6,23,0.22)), url("/backgrounds/arena-mvp.png")`,
                            backgroundSize: "cover",
                            backgroundPosition: "center center",
                            backgroundRepeat: "no-repeat",
                          }}
                        />

                        {foto ? (
                          <img
                            src={foto}
                            alt={ganador.nombre}
                            className="absolute max-w-none"
                            style={{
                              display: "block",
                              width: `${100 * ajusteFoto.zoom}%`,
                              height: "auto",
                              left: `calc(50% + ${ajusteFoto.x}px)`,
                              top: `calc(50% + ${ajusteFoto.y}px)`,
                              transform: "translate(-50%, -50%)",
                              transformOrigin: "center center",
                              filter: "contrast(1.15) saturate(1.12) brightness(1.04)",
                            }}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm font-bold text-white">
                            No hay foto disponible
                          </div>
                        )}

                        <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-white/10" />
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${configuracion.color}, transparent)` }} />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${configuracion.color}, transparent)` }} />
                      </div>

                      <div
                        className={`mt-2 w-full rounded-xl border bg-gradient-to-r from-[#172b4d] via-[#263957] to-[#172b4d] text-center shadow-[0_0_18px_rgba(0,0,0,0.25)] ${
                          formato === "post" ? "px-3 py-2" : "px-4 py-3"
                        }`}
                        style={{ borderColor: `${configuracion.color}99` }}
                      >
                        <p className={`font-black uppercase tracking-[0.25em] text-slate-200 ${
                          formato === "post" ? "text-[8px]" : "text-[10px]"
                        }`}>
                          TOTAL DE LA TEMPORADA
                        </p>
                        <div className="mt-0.5 flex items-baseline justify-center gap-2">
                          <p
                            className={`font-black leading-none ${
                              formato === "post" ? "text-4xl" : "text-6xl"
                            }`}
                            style={{
                              color: configuracion.color,
                              textShadow: "0 2px 8px rgba(0,0,0,0.65)",
                            }}
                          >
                            {ganador[clave]}
                          </p>
                          <p className={`font-black tracking-[0.16em] text-white ${
                            formato === "post" ? "text-sm" : "text-lg"
                          }`}>
                            {configuracion.sigla}
                          </p>
                        </div>
                      </div>

                      <p className={`mt-auto pt-2 text-center font-bold tracking-widest text-slate-300 ${
                        formato === "post" ? "text-[7px]" : "text-[10px]"
                      }`}>
                        ESTADÍSTICAS DE PARTIDOS FINALIZADOS · LIBAVIME
                      </p>
                    </div>
                  );
                })()}


{tipo === "posiciones" && (
  <div
    className={`relative flex min-h-0 flex-1 flex-col ${
      formato === "post" ? "pb-2" : "justify-center"
    }`}
  >

                    <p className={`text-xs font-black tracking-[0.2em] text-red-400 ${
  formato === "historia" ? "mt-3" : "mt-2"
}`}>
                      TEMPORADA 2026
                    </p>

<h2
  className={`mt-1 w-full text-center font-black leading-tight ${
    formato === "historia" ? "text-3xl" : "text-2xl"
  }`}
>
  TABLA DE
  <br />
  POSICIONES
</h2>




<div
  className={`overflow-hidden rounded-xl border border-white/10 bg-[#000000] ${
    formato === "post" ? "mt-2" : "mt-10"
  }`}
>


                      <div className="grid grid-cols-[28px_1fr_30px_30px_30px_40px] gap-1 bg-red-600 px-2 py-3 text-[9px] font-black">
                        <span>POS</span>
                        <span>EQUIPO</span>
                        <span className="text-center">PJ</span>
                        <span className="text-center">PG</span>
                        <span className="text-center">PP</span>
                        <span className="text-right">DIF</span>
                      </div>

                      {equipos.map((e, i) => (
                        <div
                          key={e.nombre}

className={`grid grid-cols-[28px_1fr_30px_30px_30px_40px] items-center gap-1 border-t border-white/10 px-2 ${
  formato === "post" ? "py-2" : "py-4"
} ${


i === 0
  ? "bg-[#050505]"
  : "bg-[#000000]"
}`}

                        >
                          <span className="text-sm font-black text-red-400">
                            {i + 1}
                          </span>
                          <span className="text-[11px] font-black leading-tight">
                            {e.nombre}
                          </span>
                          <span className="text-center text-xs">{e.pj}</span>
                          <span className="text-center text-xs">{e.pg}</span>
                          <span className="text-center text-xs">{e.pp}</span>
                          <span
                            className={`text-right text-xs font-black ${
                              e.dif >= 0 ? "text-emerald-300" : "text-red-300"
                            }`}
                          >
                            {e.dif > 0 ? "+" : ""}
                            {e.dif}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="mt-auto pt-5 text-center text-[10px] font-bold tracking-widest text-slate-300">
                      CLASIFICACIÓN · LIBAVIME
                    </p>
                  </div>
                )}


{tipo === "finales" && (
  <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center">
    <p className={`mt-0 text-center font-black tracking-[0.24em] text-red-400 ${
      formato === "post" ? "text-[8px]" : "text-xs"
    }`}>
      CAMPEONATO LIBAVIME 2026
    </p>

    <h2 className={`mt-1 text-center font-black uppercase leading-none tracking-[0.12em] text-white ${
      formato === "post" ? "text-[23px]" : "text-4xl"
    }`}>
      LA GRAN FINAL
    </h2>

    <p className={`mt-1 text-center font-bold uppercase tracking-[0.18em] text-slate-300 ${
      formato === "post" ? "text-[8px]" : "text-[10px]"
    }`}>
      TABLA DE LA SERIE
    </p>

    <div
      className={`mt-3 w-full shrink-0 rounded-2xl border border-amber-300/60 bg-gradient-to-br from-[#172b4d]/95 via-[#0b1730]/95 to-[#172b4d]/95 text-center shadow-[0_0_24px_rgba(212,175,55,0.20)] ${
        formato === "post" ? "px-3 py-1.5" : "px-5 py-4"
      }`}
    >
      <p className={`font-black uppercase tracking-[0.24em] text-amber-300 ${
        formato === "post" ? "text-[8px]" : "text-[10px]"
      }`}>
        MARCADOR GLOBAL
      </p>

      <div className={`mt-1 flex items-center justify-center gap-4 font-black leading-none ${
        formato === "post" ? "text-4xl" : "text-6xl"
      }`}>
        <span className="text-white">1</span>
        <span className="text-amber-300">—</span>
        <span className="text-white">1</span>
      </div>

      <p className={`mt-1 font-black uppercase tracking-[0.16em] text-slate-200 ${
        formato === "post" ? "text-[8px]" : "text-[10px]"
      }`}>
        GLADIADORES <span className="text-red-400">VS</span> ESPARTANOS
      </p>
    </div>

    <div className={`w-full shrink-0 overflow-hidden rounded-xl border border-white/15 bg-[#050b17]/95 shadow-[0_8px_24px_rgba(0,0,0,0.30)] ${
      formato === "post" ? "mt-2" : "mt-5"
    }`}>
      <div className={`grid grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.55fr))] items-center gap-1 bg-red-600 font-black uppercase text-white ${
        formato === "post" ? "px-2 py-2 text-[8px]" : "px-3 py-3 text-[10px]"
      }`}>
        <span>EQUIPO</span>
        <span className="text-center">PJ</span>
        <span className="text-center">PG</span>
        <span className="text-center">PP</span>
      </div>

      {[
        { nombre: "GLADIADORES", pj: 2, pg: 1, pp: 1 },
        { nombre: "ESPARTANOS", pj: 2, pg: 1, pp: 1 },
      ].map((equipo, indice) => (
        <div
          key={equipo.nombre}
          className={`grid grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.55fr))] items-center gap-1 border-t border-white/10 text-white ${
            formato === "post" ? "px-2 py-2" : "px-3 py-4"
          } ${indice === 0 ? "bg-white/[0.07]" : "bg-black/20"}`}
        >
          <span className={`font-black leading-tight tracking-wide ${
            formato === "post" ? "text-[9px]" : "text-xs"
          }`}>
            {equipo.nombre}
          </span>
          {[equipo.pj, equipo.pg, equipo.pp].map((valor, i) => (
            <span
              key={`${equipo.nombre}-${i}`}
              className={`text-center font-black tabular-nums ${
                formato === "post" ? "text-sm" : "text-base"
              } ${i === 1 ? "text-emerald-300" : i === 2 ? "text-red-300" : "text-white"}`}
            >
              {valor}
            </span>
          ))}
        </div>
      ))}
    </div>

    <div className={`mt-2 w-full shrink-0 rounded-xl border border-amber-300/50 bg-gradient-to-r from-[#261d0b]/95 via-[#172b4d]/95 to-[#261d0b]/95 text-center shadow-[0_0_18px_rgba(212,175,55,0.18)] ${
      formato === "post" ? "px-2 py-1.5" : "px-4 py-4"
    }`}>
      <p className={`font-black uppercase tracking-[0.22em] text-amber-300 ${
        formato === "post" ? "text-[8px]" : "text-[10px]"
      }`}>
        PRÓXIMO PARTIDO · JUEGO DECISIVO
      </p>
      <p className={`mt-1 font-black uppercase leading-tight text-white ${
        formato === "post" ? "text-[12px]" : "text-xl"
      }`}>
        ¡QUIEN GANA, LEVANTA LA COPA!
      </p>
    </div>
  </div>
)}


{(tipo === "destacado_individual" || (tipo === "destacados" && modoIndividualDestacado)) && (() => {
  const jugador = destacadoIndividual;
  if (!jugador) {
    return (
      <div className="relative z-10 flex flex-1 items-center justify-center px-5 text-center text-sm font-bold text-slate-300">
        Selecciona una jornada con jugadores destacados para editar esta tarjeta
      </div>
    );
  }

  const equipo = NOMBRES_EQUIPOS.find(
    (nombre) => normalizar(nombre) === normalizar(jugador.equipo)
  ) ?? jugador.equipo ?? "LIBAVIME";
  const jugadoresEquipo = destacadosPorEquipo.find(
    (grupo) => normalizar(grupo.equipo) === normalizar(equipo)
  )?.jugadores ?? [];
  const posicion = jugadoresEquipo.findIndex(
    (destacado: any) => String(destacado.id) === String(jugador.id)
  );
  const esPrimero = posicion <= 0;
  const colores: Record<string, { fondo: string; borde: string; acento: string; texto: string }> = {
    Gladiadores: { fondo: "#14532d", borde: "#86efac", acento: "#bbf7d0", texto: "#ffffff" },
    Vikingos: { fondo: "#581c87", borde: "#d8b4fe", acento: "#e9d5ff", texto: "#ffffff" },
    Titanes: { fondo: "#7f1d1d", borde: "#fca5a5", acento: "#fecaca", texto: "#ffffff" },
    Espartanos: { fondo: "#eab308", borde: "#fde047", acento: "#422006", texto: "#1c1917" },
  };
  const color = colores[equipo] ?? colores.Gladiadores;
  const guardado = encuadres[String(jugador.id)];
  const ajusteFoto = formato === "post"
    ? guardado?.post ?? { x: guardado?.x ?? 0, y: guardado?.y ?? 0, zoom: guardado?.zoom ?? 1 }
    : guardado?.historia ?? { x: guardado?.x ?? 0, y: guardado?.y ?? 0, zoom: guardado?.zoom ?? 1 };
  const foto = obtenerRutaFotoInstagram(jugador.nombre) || fotoValida(jugador.foto);

  return (
    <div
      className={`relative z-10 mx-auto flex min-h-0 w-full max-w-[320px] flex-none flex-col overflow-hidden rounded-2xl border-2 p-2 shadow-2xl ${formato === "post" ? "h-[330px]" : "h-[520px]"}`}
      style={{
        borderColor: color.borde,
        background: `linear-gradient(145deg, ${color.fondo} 0%, #07152e 100%)`,
        color: color.texto,
        marginTop: "5px",
        marginBottom: "5px",
      }}
    >
      <div className="relative flex h-7 shrink-0 items-center justify-center px-14">
        <p className="text-center text-sm font-black uppercase tracking-[0.20em]">
          {equipo}
        </p>
        <span className="absolute right-0 top-0 rounded-full px-3 py-1 text-[9px] font-black text-slate-950 shadow" style={{ background: esPrimero ? "#fde047" : "#ffffff" }}>
          {esPrimero ? "🥇 TOP 1" : "🥈 TOP 2"}
        </span>
      </div>

      <div className="mt-1 flex shrink-0 justify-center">
        <p className="text-[8px] font-black uppercase tracking-[0.18em]" style={{ color: color.acento }}>
          JORNADA · {fechaJornada.split("-").reverse().join("/")}
        </p>
      </div>

      <div
        className={`relative mx-auto mt-1 w-full shrink-0 overflow-hidden rounded-2xl border bg-[#061326]/50 ${formato === "post" ? "h-[165px]" : "h-[270px]"}`}
        style={{ borderColor: color.borde, touchAction: "none", cursor: "grab" }}
        onPointerDown={(evento) => iniciarArrastreFoto(evento, ajusteFoto)}
        onPointerMove={moverArrastreFoto}
        onPointerUp={terminarArrastreFoto}
        onPointerCancel={terminarArrastreFoto}
        title="Arrastra para mover y centrar la fotografía"
      >
        {foto ? (
          <img
            src={foto}
            alt={jugador.nombre}
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
            style={{
              width: `${86 * ajusteFoto.zoom}%`,
              height: "auto",
              top: `calc(42% + ${ajusteFoto.y}px)`,
              transform: `translate(calc(-50% + ${ajusteFoto.x}px), -50%)`,
              transformOrigin: "center center",
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs font-bold text-slate-300">
            No hay foto disponible para este jugador
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 border border-white/10" />
      </div>

      <div className="mt-1 shrink-0 text-center">
        <p className="text-[7px] font-black uppercase tracking-[0.2em]" style={{ color: color.acento }}>
          JUGADOR DESTACADO
        </p>
        <h2
          className="mt-0.5 px-1 text-center text-[21px] font-black uppercase leading-tight tracking-[0.04em]"
          style={{
            fontFamily: "Arial Black, Impact, sans-serif",
            fontWeight: 900,
            letterSpacing: "0.045em",
            backgroundImage:
              "linear-gradient(180deg, #fff8d6 0%, #f3d36b 16%, #b77b16 34%, #ffe99a 49%, #c28a24 64%, #f8dc83 82%, #8d5c12 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
            WebkitTextFillColor: "transparent",
            WebkitTextStroke: "1.35px #080808",
            textShadow:
              "0 1px 0 #000000, 0 2px 0 rgba(0,0,0,0.95), 0 3px 5px rgba(0,0,0,0.85)",
            filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.65))",
          }}
        >
          {jugador.nombre}
        </h2>
      </div>

      <div className={`mt-1 grid shrink-0 grid-cols-3 ${formato === "historia" ? "gap-2" : "gap-1"}`}>
        {[
          ["PTS", jugador.puntos],
          ["REB", jugador.rebotes],
          ["AST", jugador.asistencias],
        ].map(([label, valor]) => (
          <div key={String(label)} className="rounded-xl bg-white/90 px-1 py-1.5 text-center text-slate-950">
            <p className="text-[8px] font-black tracking-wider text-blue-900">{label}</p>
            <p className={`font-black leading-none ${formato === "historia" ? "text-2xl" : "text-xl"}`}>{valor}</p>
          </div>
        ))}
      </div>


    </div>
  );
})()}

{tipo === "destacados" && !modoIndividualDestacado && (
  <div className="relative z-10 flex min-h-0 flex-1 flex-col">
    <p className="mt-1 text-center text-[9px] font-black tracking-[0.2em] text-red-400">
      JORNADA · {fechaJornada.split("-").reverse().join("/")}
    </p>

    <h2 className="mt-1 text-center text-2xl font-black uppercase leading-none">
      DESTACADOS
    </h2>

    <p className="mt-1 text-center text-sm font-black uppercase text-red-400">
      {destacadosPorEquipo[equipoDestacadoIndex]?.equipo}
    </p>


<div
  className={`grid items-start ${
    formato === "historia"
      ? "my-auto grid-cols-1 gap-2"
      : "mx-2 mt-2 grid-cols-2 gap-3"
  }`}
>

      {(destacadosPorEquipo[equipoDestacadoIndex]?.jugadores ?? []).map(
        (j: any, i: number) => {

const encuadreGuardado = encuadres[String(j.id)];

const ajusteFoto =
  formato === "post"
    ? encuadreGuardado?.post ?? {
        x: encuadreGuardado?.x ?? 0,
        y: encuadreGuardado?.y ?? 0,
        zoom: encuadreGuardado?.zoom ?? 1,
      }
    : encuadreGuardado?.historia ?? {
        x: encuadreGuardado?.x ?? 0,
        y: encuadreGuardado?.y ?? 0,
        zoom: encuadreGuardado?.zoom ?? 1,
      };

          const fotoRecortada = obtenerRutaFotoInstagram(j.nombre);

          return (
            <div
              key={`${j.id}-${i}`}
              className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/20 bg-[#08172f]/95 p-1.5"
            >
              <div
  className={`relative shrink-0 overflow-hidden rounded-lg bg-[#102342] ${
    formato === "historia" ? "h-[125px]" : "h-[140px]"
  }`}
>
  {obtenerRutaFotoInstagram(j.nombre) ? (
    <img
      src={fotoRecortada}
      alt={j.nombre}
      className="absolute left-1/2 top-0 h-full w-full max-w-none object-contain object-top"
      style={{
        transform: `translate(calc(-50% + ${ajusteFoto.x}px), ${ajusteFoto.y}px) scale(${ajusteFoto.zoom})`,
        transformOrigin: "top center",
      }}
      onError={(e) => {
        console.error(
          "Error cargando foto del destacado:",
          j.nombre,
          e.currentTarget.src
        );
      }}
    />
  ) : (
    <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
      Sin foto
    </div>
  )}
</div>

              <p className="mt-1 line-clamp-2 text-center text-xs font-black leading-tight text-white">
                {j.nombre}
              </p>

              <p className="mt-0.5 truncate text-center text-[8px] font-black uppercase tracking-wider text-red-400">
                {j.equipo || "LIBAVIME"}
              </p>

             <div
  className={`grid grid-cols-3 gap-1 text-center ${
    formato === "historia" ? "pt-1" : "mt-auto pt-2"
  }`}
>
                {[
                  ["PTS", j.puntos],
                  ["REB", j.rebotes],
                  ["AST", j.asistencias],
                ].map(([label, valor]) => (
                  <div
                    key={String(label)}
                    className="rounded-md border border-white/10 bg-[#142b4b] px-0.5 py-1"
                  >
                    <p className="text-[8px] font-bold text-slate-300">
                      {label}
                    </p>
                    <p className="text-sm font-black leading-tight text-white">
                      {valor}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        }
      )}
    </div>

    {destacadosJornada.length === 0 && (
      <p className="mt-2 text-center text-xs text-slate-300">
        No hay estadísticas registradas para esta jornada.
      </p>
    )}
  </div>
)}

{tipo === "mvp" && (
  <div className="relative z-10 -mt-1 flex flex-1 flex-col items-center gap-0">

    <h2
  className={`mt-1 text-center font-black uppercase leading-tight tracking-[0.14em] ${
    formato === "post" ? "text-2xl" : "text-3xl"
  }`}
  style={{
    fontFamily: "Arial, Helvetica, sans-serif",
    ...(normalizar(candidatosMVP[candidatoMVPIndex]?.nombre) ===
    "welmert de los santos"
      ? {
          background:
            "linear-gradient(180deg, #fff8d6 0%, #f5d77a 30%, #d49a25 65%, #fff0a6 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.9))",
        }
      : {
          color: "#FFFFFF",
          textShadow: "0px 2px 4px rgba(0,0,0,0.9)",
        }),
  }}
>
  {normalizar(candidatosMVP[candidatoMVPIndex]?.nombre) ===
  "welmert de los santos"
    ? "MVP"
    : "CANDIDATO MVP"}
</h2>


    <h3
  className={`mt-1 w-full px-1 text-center font-black uppercase leading-tight tracking-[0.12em] ${
    formato === "post" ? "text-[20px]" : "text-[29px]"
  }`}
  style={{
    fontFamily: "Arial, Helvetica, sans-serif",
    background: "linear-gradient(180deg, #fff6c7 0%, #f8d66d 25%, #d49a25 55%, #fff0a6 78%, #a96b12 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    filter: "drop-shadow(0px 2px 3px rgba(0,0,0,0.85))",
  }}
>
  {candidatosMVP[candidatoMVPIndex]?.nombre ?? "SIN CANDIDATO"}
</h3>
    <div className="mx-auto mt-0 mb-1 inline-flex items-center justify-center rounded-full border border-amber-400/60 bg-gradient-to-r from-[#172b4d] via-[#243653] to-[#172b4d] px-5 py-1 shadow-[0_0_12px_rgba(245,158,11,0.18)]">
  <p className="text-center text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">
    {candidatosMVP[candidatoMVPIndex]?.equipo ?? "LIBAVIME"}
  </p>
</div>

    {(() => {
  const candidato = candidatosMVP[candidatoMVPIndex];

  if (!candidato) return null;

  const claveEncuadre = `mvp-${candidato.id}`;
  const guardado = encuadres[claveEncuadre];

  const ajuste = guardado?.[formato] ?? {
    x: guardado?.x ?? 0,
    y: guardado?.y ?? 0,
    zoom: guardado?.zoom ?? 1,
  };

  const foto = obtenerRutaFotoInstagram(candidato.nombre);

  return (
    <div
      className={`relative mx-auto mt-0 w-full shrink-0 overflow-hidden rounded-2xl border-2 border-amber-300 bg-[#101d38] shadow-[0_0_25px_rgba(245,158,11,0.35)] ring-1 ring-amber-100/30 ${
  formato === "post" ? "h-[115px]" : "h-[180px]"
}`}
    >
      <div
  className="absolute inset-0"
  style={{
    backgroundImage: `
      linear-gradient(rgba(2,6,23,0.08), rgba(2,6,23,0.18)),
      url("/backgrounds/arena-mvp.png")
    `,
    backgroundSize: "cover",
    backgroundPosition: "center center",
    backgroundRepeat: "no-repeat",
  }}
/>


      {foto ? (
        <img
          src={foto}
          alt={candidato.nombre}
          className="absolute max-w-none"
          style={{
            display: "block",
            width: `${100 * ajuste.zoom}%`,
            height: "auto",
            left: `calc(50% + ${ajuste.x}px)`,
            top: `calc(50% + ${ajuste.y}px)`,
            transform: "translate(-50%, -50%)",
            transformOrigin: "center center",
            filter: "contrast(1.15) saturate(1.12) brightness(1.04)",
          }}
        />
      ) : (

        <div className="flex h-full items-center justify-center text-sm text-white">
          No hay foto disponible
        </div>

      )}
      <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-amber-300/80 shadow-[inset_0_0_25px_rgba(245,158,11,0.35),0_0_18px_rgba(245,158,11,0.25)]" />

<div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-amber-200 to-transparent shadow-[0_0_12px_rgba(255,215,90,0.9)]" />

<div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_rgba(239,68,68,0.7)]" />
    </div>
  );
})()}

    {candidatosMVP[candidatoMVPIndex] && (
  <div
    className={`w-full rounded-xl border border-amber-400/30 bg-[#0b1b36]/95 ${
      formato === "post" ? "px-2 py-1" : "px-3 py-2"

    }`}
  >
    <p className="mb-1 text-center text-[10px] font-black tracking-widest text-amber-400">
      PROMEDIOS POR PARTIDO
    </p>

    <div className="grid grid-cols-3 gap-2">
  {[
    ["PPG", candidatosMVP[candidatoMVPIndex].ppg],
["APG", candidatosMVP[candidatoMVPIndex].apg],
["RPG", candidatosMVP[candidatoMVPIndex].rpg],
].map(([label, valor]) => (

  <div
    key={String(label)}
    className="relative overflow-hidden rounded-xl border border-amber-300/70 bg-gradient-to-b from-[#263957]/95 via-[#111d34]/95 to-[#070d19]/95 px-1 py-0 text-center shadow-[0_0_16px_rgba(245,158,11,0.20)]"
  >
    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#fff0a6] to-transparent" />

    <p className="text-[10px] font-black tracking-[0.22em] text-amber-300">
      {label}
    </p>

    <p
      className={`font-black leading-none ${
        formato === "post" ? "text-2xl" : "text-4xl"
      }`}
      style={{
        background:
          "linear-gradient(180deg, #fff8d6 0%, #f5d77a 30%, #d49a25 65%, #fff0a6 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        filter: "drop-shadow(0px 2px 3px rgba(0,0,0,0.9))",
      }}
    >
      {valor}
    </p>
  </div>
))}
</div>

<div className="mt-2 rounded-xl border border-amber-400/70 bg-gradient-to-r from-[#172b4d] via-[#263957] to-[#172b4d] px-3 py-2 text-center shadow-[0_0_18px_rgba(245,158,11,0.25)]">
  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300">
    PUNTUACIÓN MVP
  </p>

  <p
    className={`font-black leading-none ${
      formato === "post" ? "text-3xl" : "text-5xl"
    }`}
    style={{
      background:
        "linear-gradient(180deg, #fff8d6 0%, #f5d77a 30%, #d49a25 65%, #fff0a6 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      filter: "drop-shadow(0px 2px 3px rgba(0,0,0,0.9))",
    }}
  >
    {candidatosMVP[candidatoMVPIndex].puntuacion_mvp.toFixed(2)}
  </p>

  <p className="text-[9px] font-bold tracking-widest text-amber-200">
    PUNTOS
  </p>
</div>




    </div>

)}
  </div>
)}

<footer
  className={`relative z-10 flex shrink-0 flex-col items-center border-t border-white/20 text-center ${
    tipo === "mvp"
  ? "mt-auto pt-1 border-amber-400/40"
  : tipo === "destacados" && formato === "post"
    ? "mt-[-200px] pt-1"
    : tipo === "destacado_individual" || (tipo === "destacados" && modoIndividualDestacado)
      ? "mt-auto pt-1 pb-2"
    : tipo === "lideres" && formato === "post"
      ? "mt-0 pt-1"
      : "mt-1 pt-1"
  }`}
>

  <p
    className={`mt-1 font-bold tracking-wide text-amber-400 ${
  formato === "post" ? "text-[8px]" : "text-[9px]"
}`}
  >
    Diseñado y desarrollado por Emmi De La Cruz
  </p>
</footer>


              </div>
            </div>
            <div className="mt-5 w-full rounded-3xl bg-slate-200 p-4">
  <div className="mb-3 flex w-full justify-between">
    <h2 className="font-black text-blue-950">
      Segunda vista previa
    </h2>

    <span className="text-xs font-bold text-slate-500">
      {formato === "historia" ? "9:16" : "4:5"}
    </span>
  </div>

  <div
    ref={copiaVistaRef}
    className="flex w-full justify-center overflow-x-auto pb-2"
  />
</div>
          </div>
        </section>
      </div>
    </main>
  );
}
