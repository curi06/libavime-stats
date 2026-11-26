
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Jugador = {
  id: string | number;
  nombre: string;
  foto?: string | null;
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

type Configuracion = {
  version: number;
  jugadores: Record<string, Encuadre>;
};

const ENCUADRE_INICIAL: Encuadre = {
  x: 0,
  y: 0,
  zoom: 1,
};

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

function obtenerRutaFoto(jugador: Jugador) {
  const nombre = jugador.nombre.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/\s+/g, " ");
  const archivo = FOTOS_LOCALES[nombre];
  if (archivo) return `/backgrounds/jugadores/${encodeURIComponent(archivo)}`;
  return "/backgrounds/alvaro-recortado.png";
}

export default function EncuadresPage() {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [jugadorId, setJugadorId] = useState("");
  const [formato, setFormato] = useState<"post" | "historia">("post");
  const [encuadres, setEncuadres] = useState<Record<string, Encuadre>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [arrastrando, setArrastrando] = useState(false);

  const marcoRef = useRef<HTMLDivElement>(null);
  const arrastreRef = useRef({
    x: 0,
    y: 0,
    origenX: 0,
    origenY: 0,
  });

  const jugador = jugadores.find(
    (item) => String(item.id) === jugadorId
  );

  const encuadreGuardado = jugador
  ? encuadres[String(jugador.id)] ?? ENCUADRE_INICIAL
  : ENCUADRE_INICIAL;

const encuadre = {
  ...ENCUADRE_INICIAL,
  ...(formato === "post"
    ? encuadreGuardado.post ?? encuadreGuardado
    : encuadreGuardado.historia ?? encuadreGuardado),
};

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const [respuestaJugadores, respuestaEncuadres] = await Promise.all([
          fetch("/api/jugadores", { cache: "no-store" }),
          fetch("/api/encuadres", { cache: "no-store" }),
        ]);

        if (!respuestaJugadores.ok) {
          throw new Error("No se pudieron cargar los jugadores.");
        }

        if (!respuestaEncuadres.ok) {
          throw new Error("No se pudieron cargar los encuadres.");
        }

        const datosJugadores = await respuestaJugadores.json();
        const datosEncuadres: Configuracion =
          await respuestaEncuadres.json();

        if (!activo) return;

        const lista: Jugador[] = datosJugadores.jugadores ?? [];

        setJugadores(lista);
        setEncuadres(datosEncuadres.jugadores ?? {});

        if (lista.length) {
          setJugadorId(String(lista[0].id));
        }
      } catch (error) {
  console.error("Error al cargar el editor de encuadres:", error);

  if (activo) {
    setMensaje(
      error instanceof Error
        ? `Error: ${error.message}`
        : "Ocurrió un error al cargar el editor."
    );
  }

      } finally {
        if (activo) setCargando(false);
      }
    }

    cargar();

    return () => {
      activo = false;
    };
  }, []);

  const actualizarEncuadre = useCallback(
  (cambios: Partial<AjusteFormato>) => {
    if (!jugador) return;

    const id = String(jugador.id);

    setEncuadres((actuales) => {
      const anterior = actuales[id] ?? ENCUADRE_INICIAL;

      const basePost = anterior.post ?? anterior;
      const baseHistoria = anterior.historia ?? anterior;

      return {
        ...actuales,
        [id]: {
          ...anterior,
          [formato]: {
            ...(formato === "post" ? basePost : baseHistoria),
            ...cambios,
          },
        },
      };
    });
  },
  [jugador, formato]
);

  function iniciarArrastre(e: React.PointerEvent<HTMLDivElement>) {
    if (!marcoRef.current) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrastrando(true);

    arrastreRef.current = {
      x: e.clientX,
      y: e.clientY,
      origenX: encuadre.x,
      origenY: encuadre.y,
    };
  }

  function moverFoto(e: React.PointerEvent<HTMLDivElement>) {
    if (!arrastrando || !marcoRef.current) return;

    const rect = marcoRef.current.getBoundingClientRect();

    actualizarEncuadre({
      x:
        arrastreRef.current.origenX +
        ((e.clientX - arrastreRef.current.x) / rect.width) * 100,
      y:
        arrastreRef.current.origenY +
        ((e.clientY - arrastreRef.current.y) / rect.height) * 100,
    });
  }

  async function guardarEncuadre() {
    setGuardando(true);
    setMensaje("");

    try {
      const respuesta = await fetch("/api/encuadres", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: 1,
          jugadores: encuadres,
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado.error ?? "No se pudo guardar.");
      }

      setMensaje("Encuadre guardado correctamente.");
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el encuadre."
      );
    } finally {
      setGuardando(false);
    }
  }

  function restablecer() {
    actualizarEncuadre(ENCUADRE_INICIAL);
    setMensaje("Encuadre restablecido. Guarda para conservar el cambio.");
  }

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white md:p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black">
          Encuadres de jugadores
        </h1>

        <p className="mt-2 text-slate-300">
          Arrastra cada fotografía para centrarla y ajusta el zoom.
        </p>

        {cargando ? (
          <p className="mt-8">Cargando jugadores...</p>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-[280px_1fr]">
            <section className="space-y-4 rounded-2xl bg-slate-900 p-5">
                <label className="block text-sm font-bold">
  Formato del encuadre
</label>

<select
  value={formato}
  onChange={(e) =>
    setFormato(e.target.value as "post" | "historia")
  }
  className="w-full rounded-lg bg-slate-800 p-3 text-white"
>
  <option value="post">Post</option>
  <option value="historia">Historia</option>
</select>
              <label className="block text-sm font-bold">
                Seleccionar jugador
              </label>

              <select
                value={jugadorId}
                onChange={(e) => {
                  setJugadorId(e.target.value);
                  setMensaje("");
                }}
                className="w-full rounded-lg bg-slate-800 p-3 text-white"
              >
                {jugadores.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.nombre}
                  </option>
                ))}
              </select>

              <label className="block text-sm font-bold">
                Zoom: {encuadre.zoom.toFixed(2)}×
              </label>

              <input
                aria-label="Zoom de la fotografía"
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={encuadre.zoom}
                onChange={(e) =>
                  actualizarEncuadre({ zoom: Number(e.target.value) })
                }
                className="w-full"
              />

              <button
                onClick={restablecer}
                className="w-full rounded-lg border border-slate-600 p-3 font-bold hover:bg-slate-800"
              >
                Restablecer encuadre
              </button>

              <button
                onClick={guardarEncuadre}
                disabled={guardando || !jugador}
                className="w-full rounded-lg bg-red-600 p-3 font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar encuadre"}
              </button>

              {mensaje && (
                <p role="status" className="text-sm text-slate-200">
                  {mensaje}
                </p>
              )}
            </section>

            <section className="rounded-2xl bg-slate-900 p-5">
              <h2 className="mb-3 font-bold">
                Vista previa · cintura hacia arriba
              </h2>

              <div
                ref={marcoRef}
                onPointerDown={iniciarArrastre}
                onPointerMove={moverFoto}
                onPointerUp={() => setArrastrando(false)}
                onPointerCancel={() => setArrastrando(false)}
                onLostPointerCapture={() => setArrastrando(false)}
                className="relative mx-auto h-[480px] w-full max-w-[360px] cursor-grab touch-none overflow-hidden rounded-2xl border border-slate-600 bg-slate-800 active:cursor-grabbing"
              >
                {jugador ? (
                  <img
                    key={jugador.id}
                    src={obtenerRutaFoto(jugador)}
                    alt={jugador.nombre}
                    draggable={false}
                    className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                    style={{
  position: "absolute",
  width: `${100 * encuadre.zoom}%`,
  height: "auto",
  maxWidth: "none",
  left: `calc(50% + ${encuadre.x}%)`,
  top: `calc(50% + ${encuadre.y}%)`,
  transform: "translate(-50%, -50%)",
}}
                  />
                ) : (
                  <p className="p-5">No hay jugadores disponibles.</p>
                )}

                <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-white/30" />
              </div>

              <p className="mt-3 text-sm text-slate-400">
                Arrastra la foto dentro del marco. Los cambios todavía no se
                aplicarán al generador de Instagram hasta que conectemos ambos.
              </p>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
