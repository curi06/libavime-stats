
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Diseno = {
  id: string;
  titulo: string;
  tipo: "post" | "historia";
  url: string;
  creado_en: string;
  jugador: string | null;
  categoria: string | null;
  jornada: string | null;
};

export default function GaleriaDisenos() {
const [esAdministrador, setEsAdministrador] = useState(false);
  const [disenos, setDisenos] = useState<Diseno[]>([]);
  const [borradores, setBorradores] = useState<Diseno[]>([]);
const [cargandoBorradores, setCargandoBorradores] = useState(false);
  const [todosLosJugadores, setTodosLosJugadores] = useState<
  { id: number; nombre: string; foto: string | null }[]
>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroJugador, setFiltroJugador] = useState("Todos");
const [filtroCategoria, setFiltroCategoria] = useState("Todas");
const [filtroFormato, setFiltroFormato] = useState("Todos");
const [filtroJornada, setFiltroJornada] = useState("Todas");
  const [error, setError] = useState("");
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [errorBorradores, setErrorBorradores] = useState("");
const [publicandoBorrador, setPublicandoBorrador] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function verificarAdministrador() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      const correoAdministrador =
        process.env.NEXT_PUBLIC_LIBAVIME_ADMIN_EMAIL
          ?.trim()
          .toLowerCase();

      if (activo) {
        setEsAdministrador(
          !error &&
            !!user?.email &&
            !!correoAdministrador &&
            user.email.trim().toLowerCase() === correoAdministrador
        );



      }
    }

    verificarAdministrador();

    return () => {
      activo = false;
    };
  }, []);



  useEffect(() => {
    let activo = true;

    async function cargarDisenos() {
      try {
        const respuesta = await fetch("/api/disenos");
        const resultado = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            resultado.error || "No se pudieron cargar los diseños."
          );
        }

        if (activo) {
          setDisenos(resultado.disenos ?? []);
        }
      } catch (err) {
        if (activo) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los diseños."
          );
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

   

    cargarDisenos();

    return () => {
      activo = false;
    };
  }, []);


  useEffect(() => {
    if (!esAdministrador) return;

    let activo = true;

    async function cargarBorradores() {
      setCargandoBorradores(true);
      setErrorBorradores("");

      try {
        const respuesta = await fetch("/api/borradores");
        const resultado = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            resultado.error || "No se pudieron cargar los borradores."
          );
        }

        if (activo) {
          setBorradores(resultado.borradores ?? []);
        }
      } catch (err) {
        if (activo) {
          setErrorBorradores(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los borradores."
          );
        }
      } finally {
        if (activo) setCargandoBorradores(false);
      }
    }

    cargarBorradores();

    return () => {
      activo = false;
    };
  }, [esAdministrador]);


useEffect(() => {
  let activo = true;

  async function cargarJugadores() {
    try {
      const respuesta = await fetch("/api/jugadores");
      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error("No se pudieron cargar los jugadores.");
      }

      if (activo) {
        setTodosLosJugadores(resultado.jugadores ?? []);
      }
    } catch (error) {
      console.error("Error cargando jugadores:", error);
    }
  }

  cargarJugadores();

  return () => {
    activo = false;
  };
}, []);



const jugadoresDisponibles = useMemo(
  () =>
    todosLosJugadores
      .map((jugador) => jugador.nombre)
      .sort((a, b) => a.localeCompare(b, "es")),
  [todosLosJugadores]
);


const jornadasDisponibles = useMemo(
  () =>
    Array.from(
      new Set(
        disenos
          .map((diseno) => diseno.jornada)
          .filter((jornada): jornada is string => Boolean(jornada))
      )
    ).sort((a, b) => b.localeCompare(a)),
  [disenos]
);

const disenosFiltrados = useMemo(
  () =>
    disenos.filter((diseno) => {
      const coincideJugador =
        filtroJugador === "Todos" ||
        diseno.jugador === filtroJugador;

      const coincideCategoria =
        filtroCategoria === "Todas" ||
        diseno.categoria === filtroCategoria;

      const coincideFormato =
        filtroFormato === "Todos" ||
        diseno.tipo === filtroFormato;

      const coincideJornada =
        filtroJornada === "Todas" ||
        diseno.jornada === filtroJornada;

      return (
        coincideJugador &&
        coincideCategoria &&
        coincideFormato &&
        coincideJornada
      );

const borradoresFiltrados = useMemo(
  () =>
    borradores.filter((diseno) => {
      const coincideJugador =
        filtroJugador === "Todos" ||
        diseno.jugador === filtroJugador;

      const coincideCategoria =
        filtroCategoria === "Todas" ||
        diseno.categoria === filtroCategoria;

      const coincideFormato =
        filtroFormato === "Todos" ||
        diseno.tipo === filtroFormato;

      const coincideJornada =
        filtroJornada === "Todas" ||
        diseno.jornada === filtroJornada;

      return (
        coincideJugador &&
        coincideCategoria &&
        coincideFormato &&
        coincideJornada
      );
    }),
  [
    borradores,
    filtroJugador,
    filtroCategoria,
    filtroFormato,
    filtroJornada,
  ]
);

    }),
  [
    disenos,
    filtroJugador,
    filtroCategoria,
    filtroFormato,
    filtroJornada,
  ]
);

const borradoresFiltrados = useMemo(
  () =>
    borradores.filter((diseno) => {
      const coincideJugador =
        filtroJugador === "Todos" ||
        diseno.jugador === filtroJugador;

      const coincideCategoria =
        filtroCategoria === "Todas" ||
        diseno.categoria === filtroCategoria;

      const coincideFormato =
        filtroFormato === "Todos" ||
        diseno.tipo === filtroFormato;

      const coincideJornada =
        filtroJornada === "Todas" ||
        diseno.jornada === filtroJornada;

      return (
        coincideJugador &&
        coincideCategoria &&
        coincideFormato &&
        coincideJornada
      );
    }),
  [
    borradores,
    filtroJugador,
    filtroCategoria,
    filtroFormato,
    filtroJornada,
  ]
);

async function publicarBorrador(diseno: Diseno) {
  const confirmado = window.confirm(
    `¿Deseas publicar "${diseno.titulo}" en la galería de LIBAVIME?`
  );

  if (!confirmado) return;

  setPublicandoBorrador(diseno.id);
  setMensaje("");
  setErrorBorradores("");

  try {
    const respuesta = await fetch("/api/disenos", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: diseno.id }),
    });

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        resultado.error || "No se pudo publicar el borrador."
      );
    }

    setBorradores((actuales) =>
      actuales.filter((item) => item.id !== diseno.id)
    );

    setDisenos((actuales) => [
      resultado.diseno,
      ...actuales.filter((item) => item.id !== diseno.id),
    ]);

    setMensaje(
      `¡"${diseno.titulo}" se publicó correctamente en la galería!`
    );
  } catch (err) {
    setErrorBorradores(
      err instanceof Error
        ? err.message
        : "No se pudo publicar el borrador."
    );
  } finally {
    setPublicandoBorrador(null);
  }
}


  async function eliminarDiseno(diseno: Diseno) {
    const confirmado = window.confirm(
      `¿Seguro que deseas eliminar "${diseno.titulo}"? Esta acción no se puede deshacer.`
    );

    if (!confirmado) return;

    setEliminando(diseno.id);
    setMensaje("");
    setError("");

    try {
      const respuesta = await fetch(
        `/api/disenos?id=${encodeURIComponent(diseno.id)}`,
        { method: "DELETE" }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.error || "No se pudo eliminar la publicación."
        );
      }

      setDisenos((actuales) =>
        actuales.filter((item) => item.id !== diseno.id)
      );
      setMensaje("La publicación se eliminó correctamente.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar la publicación."
      );
    } finally {
      setEliminando(null);
    }
  }

  return (
    <section
      id="galeria-disenos"
      className="my-12 rounded-3xl bg-white p-5 shadow-lg md:p-8"
    >
      <div className="mb-7 text-center">
        <p className="text-sm font-black uppercase tracking-[0.25em] text-red-600">
          Contenido oficial
        </p>

        <h2 className="mt-2 text-3xl font-black text-blue-950 md:text-4xl">
          Galería de diseños LIBAVIME
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          Descarga los flyers, publicaciones e historias creados para
          compartir la actividad de nuestra liga.
        </p>
      </div>

<div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-6">
  <h3 className="mb-4 text-lg font-black text-blue-950">
    Encuentra tu diseño
  </h3>

  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        1. Jugador
      </label>
      <select
        value={filtroJugador}
        onChange={(e) => setFiltroJugador(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white p-3"
      >
        <option value="Todos">Todos los jugadores</option>
        {jugadoresDisponibles.map((nombre) => (
          <option key={nombre} value={nombre}>
            {nombre}
          </option>
        ))}
      </select>
    </div>

    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        2. Tipo de diseño
      </label>
      <select
        value={filtroCategoria}
        onChange={(e) => setFiltroCategoria(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white p-3"
      >
        <option value="Todas">Todos los diseños</option>
        <option value="jugador">Jugador</option>
        <option value="lideres">Líderes</option>
        <option value="posiciones">Posiciones</option>
        <option value="destacados">Destacados de la jornada</option>
      </select>
    </div>

    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        3. Formato
      </label>
      <select
        value={filtroFormato}
        onChange={(e) => setFiltroFormato(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white p-3"
      >
        <option value="Todos">Todos los formatos</option>
        <option value="post">Post de Instagram</option>
        <option value="historia">Historia de Instagram</option>
      </select>
    </div>

    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        4. Jornada
      </label>
      <select
        value={filtroJornada}
        onChange={(e) => setFiltroJornada(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white p-3"
      >
        <option value="Todas">Todas las jornadas</option>
        {jornadasDisponibles.map((jornada) => (
          <option key={jornada} value={jornada}>
            {jornada}
          </option>
        ))}
      </select>
    </div>
  </div>

  <button
    type="button"
    onClick={() => {
      setFiltroJugador("Todos");
      setFiltroCategoria("Todas");
      setFiltroFormato("Todos");
      setFiltroJornada("Todas");
    }}
    className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold text-blue-950 hover:bg-slate-100"
  >
    Limpiar filtros
  </button>
</div>

{esAdministrador && (
  <section className="mb-10 rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 md:p-6">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-xl font-black text-blue-950">
          Borradores privados
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Diseños guardados que todavía no se han publicado.
        </p>
      </div>

      <span className="rounded-full bg-amber-200 px-3 py-1 text-sm font-bold text-amber-950">
        {borradores.length} borradores
      </span>
    </div>

    {cargandoBorradores && (
      <p className="py-5 text-center text-slate-600">
        Cargando borradores...
      </p>
    )}

    {errorBorradores && (
      <p
        role="alert"
        className="rounded-xl bg-red-100 p-4 text-red-800"
      >
        {errorBorradores}
      </p>
    )}

    {!cargandoBorradores &&
      !errorBorradores &&
      borradores.length === 0 && (
        <div className="rounded-xl border border-dashed border-amber-300 bg-white p-6 text-center">
          <p className="font-bold text-blue-950">
            Todavía no tienes borradores.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Cuando guardes un diseño sin publicarlo desde el editor,
            aparecerá aquí.
          </p>
        </div>
      )}

    {!cargandoBorradores &&
      borradoresFiltrados.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {borradoresFiltrados.map((diseno) => (
            <article
              key={diseno.id}
              className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm"
            >
              <a
                href={diseno.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ver borrador: ${diseno.titulo}`}
                className="block bg-slate-100"
              >
                <img
                  src={diseno.url}
                  alt={diseno.titulo}
                  loading="lazy"
                  className="mx-auto max-h-[480px] w-full object-contain"
                />
              </a>

              <div className="p-4">
                <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase text-amber-900">
                  {diseno.tipo === "historia"
                    ? "Historia 9:16"
                    : "Post 4:5"}
                </span>

                <h4 className="mt-3 font-black text-blue-950">
                  {diseno.titulo}
                </h4>

                {diseno.jugador && (
                  <p className="mt-1 text-sm text-slate-600">
                    Jugador: {diseno.jugador}
                  </p>
                )}

                {diseno.jornada && (
                  <p className="mt-1 text-sm text-slate-600">
                    Jornada: {diseno.jornada}
                  </p>
                )}

                <p className="mt-2 text-xs text-amber-800">
                  Guardado el{" "}
                  {new Date(diseno.creado_en).toLocaleDateString("es-DO")}
                </p>

                <a
                  href={diseno.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex w-full items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-center font-bold text-blue-950 transition hover:bg-slate-50"
                >
                  Ver o descargar diseño
                </a>

<button
  type="button"
  onClick={() => publicarBorrador(diseno)}
  disabled={publicandoBorrador !== null}
  className="mt-3 flex w-full items-center justify-center rounded-xl bg-green-700 px-4 py-3 text-center font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
>
  {publicandoBorrador === diseno.id
    ? "Publicando..."
    : "Publicar diseño"}
</button>

              </div>
            </article>
          ))}
        </div>
      )}

    {!cargandoBorradores &&
      !errorBorradores &&
      borradores.length > 0 &&
      borradoresFiltrados.length === 0 && (
        <p className="rounded-xl bg-white p-5 text-center text-slate-600">
          No hay borradores que coincidan con los filtros seleccionados.
        </p>
      )}
  </section>
)}



      {cargando && (
        <p className="py-8 text-center text-slate-500">
          Cargando diseños...
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-red-50 p-4 text-center text-red-700"
        >
          {error}
        </p>
      )}

      {mensaje && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-green-50 p-4 text-center text-green-800"
        >
          {mensaje}
        </p>
      )}

      {!cargando && !error && disenos.length === 0 && (
        <div className="rounded-2xl bg-slate-50 p-8 text-center">
          <p className="text-lg font-bold text-blue-950">
            Próximamente, nuevos diseños
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Los diseños publicados desde el editor de Instagram aparecerán aquí.
          </p>
        </div>
      )}



      {disenos.length > 0 &&
  (
    filtroJugador !== "Todos" ||
    filtroCategoria !== "Todas" ||
    filtroFormato !== "Todos" ||
    filtroJornada !== "Todas"
  ) && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {disenosFiltrados.map((diseno) => (
            <article
              key={diseno.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <a
                href={diseno.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ver imagen: ${diseno.titulo}`}
                className="block bg-slate-100"
              >
                <img
                  src={diseno.url}
                  alt={diseno.titulo}
                  loading="lazy"
                  className="mx-auto max-h-[480px] w-full object-contain"
                />
              </a>

              <div className="p-4">
                <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-900">
                  {diseno.tipo === "historia" ? "Historia 9:16" : "Post 4:5"}
                </span>

                <h3 className="mt-3 font-black text-blue-950">
                  {diseno.titulo}
                </h3>

                
<a
  href={`/api/disenos/descargar?id=${encodeURIComponent(diseno.id)}`}
  className="mt-4 flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-3 text-center font-black text-white transition hover:bg-red-700"
>
  ↓ Descargar PNG
</a>



{esAdministrador && (
  <button
    type="button"
    onClick={() => eliminarDiseno(diseno)}
    disabled={eliminando !== null}
    className="mt-3 w-full rounded-xl border border-red-200 bg-white px-4 py-3 font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {eliminando === diseno.id
      ? "Eliminando..."
      : "Eliminar publicación"}
  </button>
)}

              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
