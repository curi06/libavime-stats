
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

function obtenerRutaFoto(jugador: Jugador) {
  const foto = jugador.foto?.trim();

  if (foto && (foto.startsWith("https://") || foto.startsWith("http://") || foto.startsWith("/"))) {
    return foto;
  }

  const nombre = jugador.nombre.trim().toLowerCase();

  if (nombre === "álvaro ruiz" || nombre === "alvaro ruiz") {
    return "/backgrounds/alvaro-recortado.png";
  }

  if (nombre === "wilmer pacheco") {
    return "/backgrounds/jugadores/wilmer-pacheco.png";
  }

  const nombreArchivo = jugador.nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");

  return `/backgrounds/jugadores/${nombreArchivo}_noBackground.png`;
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
          fetch("/api/encuadres-jugadores", { cache: "no-store" }),
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
