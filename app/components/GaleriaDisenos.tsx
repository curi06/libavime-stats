
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Diseno = {
  id: string;
  titulo: string;
  tipo: "post" | "historia";
  url: string;
  creado_en: string;
};

export default function GaleriaDisenos() {
const [esAdministrador, setEsAdministrador] = useState(false);
  const [disenos, setDisenos] = useState<Diseno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");

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

      {disenos.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {disenos.map((diseno) => (
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
                  href={diseno.url}
                  download={
                    diseno.titulo.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() +
                    ".png"
                  }
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
