// app/planilla/page.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { supabase } from "@/lib/supabase";

type Jugador = {
  id: number;
  nombre: string;
  numero: number | null;
  equipo: string | null;
};

type Partido = {
  id: number;
  equipo_local: string | null;
  equipo_visitante: string | null;
  fecha: string | null;
  hora: string | null;
  cancha: string | null;
  puntos_local: number | null;
  puntos_visitante: number | null;
  estado: string | null;
};

type Estadistica = {
  jugador_id: number;
  puntos: number;
  rebotes: number;
  asistencias: number;
  faltas: number;
  flagrantes: number;
  tiros_encestados: number;
  tiros_fallados: number;
  estado: "jugó" | "no_jugo" | "lesionado";
};

type Accion = {
  jugadorId: number;
  campo: keyof Pick<
    Estadistica,
    | "puntos"
    | "rebotes"
    | "asistencias"
    | "faltas"
    | "flagrantes"
    | "tiros_encestados"
    | "tiros_fallados"
  >;
  cantidad: number;
};

const inicial: Omit<Estadistica, "jugador_id"> = {
  puntos: 0,
  rebotes: 0,
  asistencias: 0,
  faltas: 0,
  flagrantes: 0,
  tiros_encestados: 0,
  tiros_fallados: 0,
  estado: "jugó",
};

function normalizar(texto: string | null | undefined) {
  return String(texto ?? "").trim().toLowerCase();
}

function fechaPartido(fecha: string | null, hora: string | null) {
  if (!fecha) return "";
  return `${fecha}${hora ? ` · ${hora}` : ""}`;
}

export default function PlanillaPage() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [partidoId, setPartidoId] = useState("");
  const [equipoActivo, setEquipoActivo] = useState("");
  const [estadisticas, setEstadisticas] = useState<
    Record<number, Estadistica>
  >({});
  const [historial, setHistorial] = useState<Accion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("Listo para comenzar.");
  const [error, setError] = useState("");
  const colasGuardado = useRef<Record<number, Promise<void>>>({});

  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [iniciandoSesion, setIniciandoSesion] = useState(false);
  const [errorAcceso, setErrorAcceso] = useState("");

  useEffect(() => {
    let activo = true;

    async function verificarAcceso() {
      setAutorizado(null);
      setErrorAcceso("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!activo) return;

      if (!session) {
        setAutorizado(false);
        return;
      }

      const {
        data,
        error: rpcError,
      } = await supabase.rpc("usuario_puede_planilla");

      if (!activo) return;

      if (rpcError) {
        console.error(
          "Error verificando permiso de planilla:",
          rpcError
        );
        setErrorAcceso(
          "No se pudo verificar el permiso de planilla."
        );
        setAutorizado(false);
        return;
      }

      setAutorizado(Boolean(data));
    }

    void verificarAcceso();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!activo) return;

      if (!session) {
        setAutorizado(false);
      }
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, []);

  async function iniciarSesion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorAcceso("");

    if (!correo.trim() || !contrasena) {
      setErrorAcceso(
        "Completa el correo y la contraseña."
      );
      return;
    }

    setIniciandoSesion(true);

    const {
      error: loginError,
    } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: contrasena,
    });

    if (loginError) {
      setErrorAcceso(
        "Correo o contraseña incorrectos."
      );
      setIniciandoSesion(false);
      return;
    }

    const {
      data,
      error: rpcError,
    } = await supabase.rpc("usuario_puede_planilla");

    if (rpcError || !data) {
      await supabase.auth.signOut();
      setAutorizado(false);
      setErrorAcceso(
        "Tu usuario no está autorizado para utilizar la planilla."
      );
      setIniciandoSesion(false);
      return;
    }

    setAutorizado(true);
    setContrasena("");
    setIniciandoSesion(false);
  }

  useEffect(() => {
    if (autorizado !== true) return;

    async function cargar() {
      setCargando(true);
      setError("");

      const [
        {
          data: partidosData,
          error: partidosError,
        },
        {
          data: jugadoresData,
          error: jugadoresError,
        },
      ] = await Promise.all([
        supabase
          .from("partidos")
          .select(
            "id, equipo_local, equipo_visitante, fecha, hora, cancha, puntos_local, puntos_visitante, estado"
          )
          .order("fecha", { ascending: false })
          .order("hora", { ascending: false }),

        supabase
          .from("jugadores")
          .select("id, nombre, numero, equipo")
          .order("equipo", { ascending: true })
          .order("numero", { ascending: true }),
      ]);

      if (partidosError || jugadoresError) {
        setError(
          partidosError?.message ||
            jugadoresError?.message ||
            "No se pudieron cargar los datos."
        );
      } else {
        setPartidos((partidosData ?? []) as Partido[]);
        setJugadores((jugadoresData ?? []) as Jugador[]);
      }

      setCargando(false);
    }

    void cargar();
  }, [autorizado]);

  const partido = useMemo(
    () => partidos.find((item) => item.id === Number(partidoId)) ?? null,
    [partidos, partidoId]
  );

  useEffect(() => {
    if (!partido) return;

    setEquipoActivo(
      partido.equipo_local ?? partido.equipo_visitante ?? ""
    );
  }, [partido]);

  const jugadoresDelPartido = useMemo(() => {
    if (!partido) return [];

    const local = normalizar(partido.equipo_local);
    const visitante = normalizar(partido.equipo_visitante);

    return jugadores
      .filter((jugador) => {
        const equipo = normalizar(jugador.equipo);
        return equipo === local || equipo === visitante;
      })
      .sort((a, b) => {
        const equipoA =
          normalizar(a.equipo) === local ? 0 : 1;

        const equipoB =
          normalizar(b.equipo) === local ? 0 : 1;

        if (equipoA !== equipoB) {
          return equipoA - equipoB;
        }

        return (
          Number(a.numero ?? 999) -
          Number(b.numero ?? 999)
        );
      });
  }, [jugadores, partido]);

  async function cargarEstadisticas(id: string) {
    setPartidoId(id);
    setHistorial([]);
    setMensaje("");
    setError("");

    if (!id) {
      setEstadisticas({});
      return;
    }

    const {
      data,
      error: statsError,
    } = await supabase
      .from("estadisticas_partido")
      .select(
        "jugador_id, puntos, rebotes, asistencias, faltas, flagrantes, tiros_encestados, tiros_fallados, estado"
      )
      .eq("partido_id", Number(id));

    if (statsError) {
      setError(statsError.message);
      return;
    }

    const mapa: Record<number, Estadistica> = {};

    (data ?? []).forEach((fila: any) => {
      const jugadorId = Number(fila.jugador_id);

      mapa[jugadorId] = {
        jugador_id: jugadorId,
        puntos: Number(fila.puntos) || 0,
        rebotes: Number(fila.rebotes) || 0,
        asistencias: Number(fila.asistencias) || 0,
        faltas: Number(fila.faltas) || 0,
        flagrantes: Number(fila.flagrantes) || 0,
        tiros_encestados:
          Number(fila.tiros_encestados) || 0,
        tiros_fallados:
          Number(fila.tiros_fallados) || 0,
        estado:
          fila.estado === "no_jugo" ||
          fila.estado === "lesionado"
            ? fila.estado
            : "jugó",
      };
    });

    setEstadisticas(mapa);
    setMensaje("Estadísticas cargadas.");
  }

  function guardarFila(
    jugadorId: number,
    nueva: Estadistica
  ) {
    if (!partidoId) {
      return Promise.resolve();
    }

    const anterior =
      colasGuardado.current[jugadorId] ??
      Promise.resolve();

    const siguiente = anterior
      .catch(() => undefined)
      .then(async () => {
        setGuardando(jugadorId);
        setError("");

        const {
          error: saveError,
        } = await supabase
          .from("estadisticas_partido")
          .upsert(
            {
              partido_id: Number(partidoId),
              jugador_id: jugadorId,
              puntos: Math.max(0, nueva.puntos),
              rebotes: Math.max(0, nueva.rebotes),
              asistencias: Math.max(
                0,
                nueva.asistencias
              ),
              faltas: Math.max(0, nueva.faltas),
              flagrantes: Math.max(
                0,
                nueva.flagrantes
              ),
              tiros_encestados: Math.max(
                0,
                nueva.tiros_encestados
              ),
              tiros_fallados: Math.max(
                0,
                nueva.tiros_fallados
              ),
              estado: nueva.estado,
            },
            {
              onConflict: "partido_id,jugador_id",
            }
          );

        if (saveError) {
          setError(saveError.message);
          setMensaje(
            "No se pudo guardar esta acción."
          );
          throw saveError;
        }

        setMensaje(
          "🟢 Guardado en tiempo real"
        );
      })
      .finally(() => {
        setGuardando((actual) =>
          actual === jugadorId
            ? null
            : actual
        );
      });

    colasGuardado.current[jugadorId] =
      siguiente.then(
        () => undefined,
        () => undefined
      );

    return siguiente;
  }

  function obtenerEstadistica(
    jugadorId: number
  ): Estadistica {
    const actual =
      estadisticas[jugadorId];

    return {
      jugador_id: jugadorId,
      puntos: actual?.puntos ?? 0,
      rebotes: actual?.rebotes ?? 0,
      asistencias: actual?.asistencias ?? 0,
      faltas: actual?.faltas ?? 0,
      flagrantes: actual?.flagrantes ?? 0,
      tiros_encestados:
        actual?.tiros_encestados ?? 0,
      tiros_fallados:
        actual?.tiros_fallados ?? 0,
      estado: actual?.estado ?? "jugó",
    };
  }

  function aplicarAccion(
    jugadorId: number,
    campo: Accion["campo"],
    cantidad: number
  ) {
    const anterior =
      obtenerEstadistica(jugadorId);

    const valorActual =
      Number(anterior[campo]) || 0;

    const nuevoValor = Math.max(
      0,
      valorActual + cantidad
    );

    const nueva: Estadistica = {
      ...anterior,
      [campo]: nuevoValor,
    };

    setEstadisticas((actual) => ({
      ...actual,
      [jugadorId]: nueva,
    }));

    if (cantidad !== 0) {
      setHistorial((actual) => [
        ...actual,
        {
          jugadorId,
          campo,
          cantidad,
        },
      ]);
    }

    void guardarFila(jugadorId, nueva);
  }

  async function deshacer() {
    const ultima =
      historial[historial.length - 1];

    if (!ultima) {
      setMensaje(
        "No hay acciones para deshacer."
      );
      return;
    }

    const anterior =
      obtenerEstadistica(
        ultima.jugadorId
      );

    const nuevoValor = Math.max(
      0,
      Number(anterior[ultima.campo]) -
        ultima.cantidad
    );

    const nueva: Estadistica = {
      ...anterior,
      [ultima.campo]: nuevoValor,
    };

    setEstadisticas((actual) => ({
      ...actual,
      [ultima.jugadorId]: nueva,
    }));

    setHistorial((actual) =>
      actual.slice(0, -1)
    );

    await guardarFila(
      ultima.jugadorId,
      nueva
    );

    setMensaje(
      "↩️ Última acción deshecha."
    );
  }

  const equipos = useMemo(() => {
    if (!partido) return [];

    return [
      partido.equipo_local,
      partido.equipo_visitante,
    ].filter(Boolean) as string[];
  }, [partido]);

  function jugadoresEquipo(
    nombreEquipo: string
  ) {
    return jugadoresDelPartido.filter(
      (jugador) =>
        normalizar(jugador.equipo) ===
        normalizar(nombreEquipo)
    );
  }

  if (autorizado === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="text-center">
          <div className="text-4xl">🏀</div>

          <p className="mt-3 text-lg font-black">
            Verificando acceso...
          </p>
        </div>
      </main>
    );
  }

  if (!autorizado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
          <div className="text-center">
            <div className="text-5xl">🏀</div>

            <p className="mt-3 text-sm font-black tracking-[0.25em] text-blue-400">
              LIBAVIME
            </p>

            <h1 className="mt-2 text-2xl font-black">
              PLANILLA EN VIVO
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Acceso exclusivo para anotadores autorizados.
            </p>
          </div>

          {errorAcceso && (
            <div className="mt-5 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm font-bold text-red-300">
              ⚠️ {errorAcceso}
            </div>
          )}

          <form
            onSubmit={iniciarSesion}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-300">
                Correo electrónico
              </label>

              <input
                type="email"
                value={correo}
                onChange={(e) =>
                  setCorreo(e.target.value)
                }
                placeholder="correo@ejemplo.com"
                autoComplete="email"
                disabled={iniciandoSesion}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-300">
                Contraseña
              </label>

              <input
                type="password"
                value={contrasena}
                onChange={(e) =>
                  setContrasena(e.target.value)
                }
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={iniciandoSesion}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={iniciandoSesion}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {iniciandoSesion
                ? "VERIFICANDO..."
                : "INGRESAR A PLANILLA"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="text-center">
          <div className="text-4xl">🏀</div>

          <p className="mt-2 text-lg font-black">
            Cargando planilla...
          </p>
        </div>
      </main>
    );
  }

  const equipoMostrado =
    equipoActivo ||
    equipos[0] ||
    "";

  const jugadoresVisibles =
    equipoMostrado
      ? jugadoresEquipo(equipoMostrado)
      : [];

  // La planilla usa el 100% del ancho disponible en cualquier móvil, especialmente en horizontal.
  // El porcentaje de cada columna evita el ancho fijo de 1545px de las versiones anteriores.
  const planillaGridStyle: CSSProperties = {
    gridTemplateColumns:
      "5% 24% 29% 10% 10% 22%",
  };

  return (
    <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-slate-950 text-white">
      <div className="w-full min-w-0 px-0.5 py-1">
        <header className="sticky top-0 z-50 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-base">
                  🏀
                </span>

                <p className="text-[9px] font-black tracking-[0.18em] text-blue-400">
                  LIBAVIME
                </p>

                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[8px] font-black">
                  🔴 EN VIVO
                </span>
              </div>

              <p className="truncate text-[10px] font-bold text-slate-300">
                {partido
                  ? `${partido.equipo_local} vs ${partido.equipo_visitante} · ${fechaPartido(
                      partido.fecha,
                      partido.hora
                    )}`
                  : "Planilla de anotación"}
              </p>
            </div>

            {partido && (
              <div className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-800 px-3 py-1">
                <div className="text-center">
                  <p className="max-w-[100px] truncate text-[8px] font-black text-slate-400">
                    {partido.equipo_local}
                  </p>

                  <p className="text-2xl font-black leading-none">
                    {partido.puntos_local ?? 0}
                  </p>
                </div>

                <span className="text-[9px] font-black text-slate-500">
                  VS
                </span>

                <div className="text-center">
                  <p className="max-w-[100px] truncate text-[8px] font-black text-slate-400">
                    {partido.equipo_visitante}
                  </p>

                  <p className="text-2xl font-black leading-none">
                    {partido.puntos_visitante ?? 0}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-1.5 border-t border-slate-800 p-1.5">
            <select
              value={partidoId}
              onChange={(e) =>
                void cargarEstadisticas(
                  e.target.value
                )
              }
              className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-[10px] font-black text-white outline-none"
            >
              <option value="">
                Selecciona el partido
              </option>

              {partidos.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.equipo_local} vs{" "}
                  {item.equipo_visitante} ·{" "}
                  {fechaPartido(
                    item.fecha,
                    item.hora
                  )}
                </option>
              ))}
            </select>

            <div className="flex shrink-0 items-center rounded-lg bg-slate-800 px-2 text-[9px] font-bold text-emerald-400">
              ●{" "}
              {guardando !== null
                ? "GUARDANDO"
                : "LISTO"}
            </div>
          </div>

          {error && (
            <div className="border-t border-red-900 bg-red-950 px-2 py-1 text-center text-[9px] font-bold text-red-300">
              ⚠️ {error}
            </div>
          )}
        </header>

        {!partido && (
          <section className="mt-3 rounded-xl border border-slate-700 bg-slate-900 p-8 text-center">
            <div className="text-4xl">
              📱🏀
            </div>

            <h2 className="mt-2 text-lg font-black">
              Selecciona el partido
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Gira el teléfono horizontalmente
              para aprovechar toda la pantalla.
            </p>
          </section>
        )}

        {partido && (
          <div className="mt-2">
            <div className="sticky top-[77px] z-40 mb-2 grid grid-cols-2 gap-1 rounded-xl border border-slate-700 bg-slate-950/95 p-1 backdrop-blur">
              {equipos.map((equipo) => {
                const activo =
                  normalizar(equipo) ===
                  normalizar(equipoMostrado);

                const local =
                  normalizar(equipo) ===
                  normalizar(
                    partido.equipo_local
                  );

                const marcador = local
                  ? partido.puntos_local ?? 0
                  : partido.puntos_visitante ??
                    0;

                return (
                  <button
                    key={equipo}
                    type="button"
                    onClick={() =>
                      setEquipoActivo(equipo)
                    }
                    className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-2 py-1 text-[11px] font-black transition active:scale-[0.98] ${
                      activo
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    <span className="truncate">
                      {equipo}
                    </span>

                    <span className="text-base">
                      {marcador}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              style={planillaGridStyle}
              className="mb-1 grid w-full items-center rounded-lg bg-slate-800 px-0.5 py-1 text-center text-[8px] font-black uppercase tracking-wide text-slate-400"
            >
              <span>#</span>
              <span className="text-left">
                Jugador
              </span>
              <span>PTS</span>
              <span>REB</span>
              <span>AST</span>
              <span>Tiros</span>
            </div>

            <section className="overflow-hidden rounded-xl border border-slate-700 bg-white text-slate-900 shadow-xl">
              <div className="flex items-center justify-between bg-slate-900 px-2 py-1.5 text-white">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-[10px] font-black">
                    {normalizar(
                      equipoMostrado
                    ) ===
                    normalizar(
                      partido.equipo_local
                    )
                      ? "L"
                      : "V"}
                  </div>

                  <h2 className="truncate text-sm font-black">
                    {equipoMostrado}
                  </h2>
                </div>

                <span className="text-[9px] font-bold text-slate-400">
                  {jugadoresVisibles.length}{" "}
                  jugadores
                </span>
              </div>

              <div className="divide-y divide-slate-200">
                {jugadoresVisibles.map(
                  (jugador) => {
                    const stats =
                      obtenerEstadistica(
                        jugador.id
                      );

                    const estaGuardando =
                      guardando === jugador.id;

                    return (
                      <div
                        key={jugador.id}
                        className="px-0.5 py-1.5"
                      >
                        <div
                          style={planillaGridStyle}
                          className="grid w-full items-center"
                        >
                          <div className="mx-auto flex h-11 w-[92%] min-w-0 items-center justify-center rounded-lg bg-slate-900 text-[clamp(12px,2vw,16px)] font-black text-white">
                            {jugador.numero ??
                              "—"}
                          </div>

                          <div className="min-w-0 px-1">
                            <div className="flex min-w-0 items-center gap-1">
                              <p
                                className="min-w-0 flex-1 truncate font-black leading-tight"
                                style={{
                                  fontSize:
                                    "clamp(14px, 2.4vw, 20px)",
                                }}
                              >
                                {jugador.nombre}
                              </p>

                              <span
                                className={`shrink-0 text-[10px] font-black ${
                                  estaGuardando
                                    ? "text-orange-500"
                                    : "text-emerald-600"
                                }`}
                                title={
                                  estaGuardando
                                    ? "Guardando"
                                    : "Guardado"
                                }
                              >
                                {estaGuardando
                                  ? "●"
                                  : "●"}
                              </span>
                            </div>
                          </div>

                          <div className="rounded-lg bg-blue-50 p-1">
                            <div className="grid grid-cols-2 gap-1.5">
                              {[1, 2, 3].map(
                                (valor) => (
                                  <button
                                    key={`mas-${valor}`}
                                    type="button"
                                    onClick={() =>
                                      aplicarAccion(
                                        jugador.id,
                                        "puntos",
                                        valor
                                      )
                                    }
                                    className="h-[38px] w-full rounded-md bg-blue-600 px-1 text-[clamp(13px,2.2vw,17px)] font-black text-white shadow-sm active:scale-95"
                                  >
                                    +{valor}
                                  </button>
                                )
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  aplicarAccion(
                                    jugador.id,
                                    "puntos",
                                    -1
                                  )
                                }
                                className="h-[38px] w-full rounded-md bg-slate-500 px-1 text-[clamp(11px,1.9vw,14px)] font-black text-white shadow-sm active:scale-95"
                              >
                                −PTS
                              </button>
                            </div>

                            <div className="mt-0.5 text-center text-[clamp(18px,3vw,28px)] font-black leading-6">
                              {stats.puntos}
                            </div>
                          </div>

                          <div className="rounded-lg bg-emerald-50 p-0.5 text-center">
                            <div className="grid grid-rows-2 gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  aplicarAccion(
                                    jugador.id,
                                    "rebotes",
                                    1
                                  )
                                }
                                className="h-[34px] w-full rounded-md bg-emerald-600 text-[clamp(12px,2vw,15px)] font-black text-white active:scale-95"
                              >
                                +
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  aplicarAccion(
                                    jugador.id,
                                    "rebotes",
                                    -1
                                  )
                                }
                                className="h-[28px] w-full rounded-md bg-slate-500 text-[clamp(11px,1.8vw,14px)] font-black text-white active:scale-95"
                              >
                                −
                              </button>
                            </div>

                            <div className="my-0.5 text-[clamp(15px,2.5vw,20px)] font-black leading-5">
                              {stats.rebotes}
                            </div>
                          </div>

                          <div className="rounded-lg bg-orange-50 p-0.5 text-center">
                            <div className="grid grid-rows-2 gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  aplicarAccion(
                                    jugador.id,
                                    "asistencias",
                                    1
                                  )
                                }
                                className="h-[34px] w-full rounded-md bg-orange-500 text-[clamp(12px,2vw,15px)] font-black text-white active:scale-95"
                              >
                                +
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  aplicarAccion(
                                    jugador.id,
                                    "asistencias",
                                    -1
                                  )
                                }
                                className="h-[28px] w-full rounded-md bg-slate-500 text-[clamp(11px,1.8vw,14px)] font-black text-white active:scale-95"
                              >
                                −
                              </button>
                            </div>

                            <div className="my-0.5 text-[clamp(15px,2.5vw,20px)] font-black leading-5">
                              {stats.asistencias}
                            </div>
                          </div>

                          <div className="rounded-lg bg-violet-50 p-0.5 text-center">
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  aplicarAccion(
                                    jugador.id,
                                    "tiros_encestados",
                                    1
                                  )
                                }
                                className="h-[38px] w-full rounded-md bg-violet-600 px-1 text-[clamp(10px,1.8vw,13px)] font-black text-white active:scale-95"
                              >
                                ENC +
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  aplicarAccion(
                                    jugador.id,
                                    "tiros_encestados",
                                    -1
                                  )
                                }
                                className="h-[38px] w-full rounded-md bg-slate-500 text-[clamp(10px,1.7vw,12px)] font-black text-white active:scale-95"
                              >
                                ENC −
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  aplicarAccion(
                                    jugador.id,
                                    "tiros_fallados",
                                    1
                                  )
                                }
                                className="h-[38px] w-full rounded-md bg-slate-700 px-1 text-[clamp(10px,1.7vw,12px)] font-black text-white active:scale-95"
                              >
                                FAL +
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  aplicarAccion(
                                    jugador.id,
                                    "tiros_fallados",
                                    -1
                                  )
                                }
                                className="h-[38px] w-full rounded-md bg-slate-500 text-[clamp(10px,1.7vw,12px)] font-black text-white active:scale-95"
                              >
                                FAL −
                              </button>
                            </div>

                            <div className="mt-0.5 text-[9px] font-black leading-3">
                              {
                                stats.tiros_encestados
                              }{" "}
                              /{" "}
                              {
                                stats.tiros_fallados
                              }
                            </div>

                            <div className="text-[8px] font-bold leading-3 text-slate-500">
                              {stats.tiros_encestados +
                                stats.tiros_fallados}{" "}
                              lanzados
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>

            <footer className="sticky bottom-1 z-50 mt-2 rounded-xl border border-slate-700 bg-slate-900/95 px-2 py-1.5 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => void deshacer()}
                  disabled={historial.length === 0}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-[10px] font-black text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ↩️ DESHACER
                </button>

                <p className="truncate text-center text-[9px] font-black text-emerald-400">
                  🟢{" "}
                  {mensaje ||
                    "Guardado en tiempo real"}
                </p>

                <div className="shrink-0 rounded-lg border border-slate-700 px-2 py-1 text-center">
                  <p className="text-[7px] uppercase text-slate-500">
                    Acciones
                  </p>

                  <p className="text-sm font-black">
                    {historial.length}
                  </p>
                </div>
              </div>
            </footer>
          </div>
        )}
      </div>
    </main>
  );
}