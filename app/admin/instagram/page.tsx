
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { supabase } from "@/lib/supabase";

type Tipo =
  | "jugador"
  | "lideres"
  | "posiciones"
  | "destacados";
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
  const [formato, setFormato] = useState<Formato>("post");
  const [categoria, setCategoria] = useState<Categoria>("puntos");
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
  const [jugadorVistaPreviaId, setJugadorVistaPreviaId] = useState("");
  const [jugadorEncuadreId, setJugadorEncuadreId] = useState("");
const [guardandoEncuadre, setGuardandoEncuadre] = useState(false);
  const [fechasJornada, setFechasJornada] = useState<string[]>([]);
  const [estadisticasJornada, setEstadisticasJornada] = useState<any[]>([]);
const [partidosJornada, setPartidosJornada] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState("");
  

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

  const lideres = useMemo(() => {
    return [...jugadores]
      .sort((a, b) => b[categoria] - a[categoria])
      .filter((j) => j[categoria] > 0)
      .slice(0, 3);
  }, [jugadores, categoria]);

  const ancho = 360;
  const alto = formato === "historia" ? 640 : 450;

  const tituloCategoria =
    categoria === "puntos"
      ? "LÍDERES EN PUNTOS"
      : categoria === "rebotes"
        ? "LÍDERES EN REBOTES"
        : "LÍDERES EN ASISTENCIAS";

  async function descargar() {
    if (!arteRef.current) return;
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

      const enlace = document.createElement("a");
      enlace.download =
        `libavime-destacados-${destacadosPorEquipo[i].equipo
          .toLowerCase()
          .replace(/\s+/g, "-")}-${fechaJornada}.png`;
      enlace.href = png;
      enlace.click();

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
      enlace.download = `libavime-${tipo}-${formato}.png`;
      enlace.href = png;
      enlace.click();
    } catch (err) {
      console.error(err);
      setError(
        "No se pudo crear la imagen. Comprueba si alguna foto externa bloquea la exportación."
      );
    } finally {
      setDescargando(false);
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
] as [Tipo, string][]).map(([valor, texto]) => (
                  <button
                    key={valor}
                    onClick={() => setTipo(valor)}
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
{tipo === "destacados" && (
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


{tipo === "destacados" && (
  <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
    <h3 className="font-black text-blue-950">
      Editor individual de jugadores
    </h3>

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
              min="-80"
              max="80"
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
              min="-100"
              max="100"
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



{tipo === "destacados" && (
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

            {tipo === "lideres" && (
              <div>
                <label className="mb-2 block text-sm font-bold">
                  Categoría estadística
                </label>
                <select
                  value={categoria}
                  onChange={(e) =>
                    setCategoria(e.target.value as Categoria)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white p-3"
                >
                  <option value="puntos">Puntos</option>
                  <option value="rebotes">Rebotes</option>
                  <option value="asistencias">Asistencias</option>
                </select>
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
  (tipo === "jugador" && !jugador)
}

              className="w-full rounded-xl bg-red-600 px-5 py-4 font-black text-white shadow-lg hover:bg-red-700 disabled:opacity-50"
            >
              {descargando
                ? "Generando imagen…"
                : `Descargar ${formato === "historia" ? "Historia" : "Post"} PNG`}
            </button>
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
  className="pointer-events-none absolute inset-0"
  style={{
    backgroundImage: `
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

                

<header className="relative flex shrink-0 items-center justify-center gap-0 border-b-2 border-red-600/70 pb-2">
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
    formato === "post" ? "h-[165px]" : "h-[280px]"
  }`}
>


      
{fotoValida(jugador.foto) ? (
  
<img
  src={
    jugador.nombre.trim().toLowerCase() === "álvaro ruiz"
      ? "/backgrounds/alvaro-recortado.png"
      : jugador.nombre.trim().toLowerCase() === "wilmer pacheco"
        ? "/backgrounds/jugadores/wilmer-pacheco.png"
        : `/backgrounds/jugadores/${jugador.nombre
            
.normalize("NFD")
.replace(/[\u0300-\u036f]/g, "")
.trim()
.toLowerCase()
.replace(/\s+/g, " ")}
_noBackground.png`
  }
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

                {tipo === "lideres" && (
                  <div
  className={`relative flex flex-1 flex-col ${
    formato === "post" ? "-translate-y-1" : ""
  }`}
>
                    
<p className={`text-xs font-black tracking-[0.20em] text-red-400 ${
  formato === "post" ? "mt-1" : "mt-6"
}`}>
  TEMPORADA 2026
</p>

                    


<h2
  className={`mt-1 w-full text-center font-black leading-tight ${
    formato === "post" ? "text-1xl" : "text-3xl"
  }`}
>
  {tituloCategoria}
</h2>



                    

<div
  className={`relative flex flex-col ${
    formato === "historia"
      ? "my-auto w-full gap-10"
      : "-mt-1 gap-"
  }`}
>


                      {lideres.map((j, i) => (
                        <div
                          key={j.id}
                          className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#00000999] p-3"
                        >
                          <span className="w-7 text-2xl font-black text-red-400">
                            {i + 1}
                          </span>

                          {fotoValida(j.foto) ? (
                            <img
                              src={fotoValida(j.foto)}
                              alt={j.nombre}
                              className="h-16 w-14 rounded-lg object-cover object-top"
                            />
                          ) : (
                            <div className="h-16 w-14 rounded-lg bg-white/10" />
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black">
                              {j.nombre}
                            </p>
                            <p className="truncate text-xs text-slate-300">
                              {j.equipo || "LIBAVIME"}
                            </p>
                          </div>

                          <p className="text-2xl font-black text-red-400">
                            {j[categoria]}
                          </p>
                        </div>
                      ))}

                      {!lideres.length && (
                        <p className="text-sm text-slate-300">
                          No hay estadísticas registradas en esta categoría.
                        </p>
                      )}
                    </div>

                    <div
                      className={`mt-auto border-t border-white/20 text-center text-[10px] font-bold tracking-widest text-slate-300 ${
  formato === "post" ? "pt-2" : "pt-4"
                      }`}
                    >
                      DATOS DE PARTIDOS FINALIZADOS
                    </div>
                  </div>
                )}

                
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

                


{tipo === "destacados" && (
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

          const nombreFoto = j.nombre
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .replace(/\s+/g, " ");

          const nombreNormalizado = nombreFoto.toLowerCase();

          const fotoRecortada =
            nombreNormalizado === "alvaro ruiz"
              ? "/backgrounds/alvaro-recortado.png"
              : nombreNormalizado === "wilmer pacheco"
                ? "/backgrounds/jugadores/wilmer-pacheco.png"
                : `/backgrounds/jugadores/${nombreFoto}_noBackground.png`;

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
  {fotoValida(j.foto) ? (
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



<footer
  className={`relative z-10 flex shrink-0 flex-col items-center border-t border-white/20 text-center ${
    tipo === "destacados" && formato === "post"
      ? "mt-[-200px] pt-1"
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
