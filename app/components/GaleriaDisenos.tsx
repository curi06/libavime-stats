"use client";

import { useEffect, useState } from "react";

type Diseno = {
  id: string;
  titulo: string;
  tipo: "post" | "historia";
  url: string;
  creado_en: string;
};

export default function GaleriaDisenos() {
  const [disenos, setDisenos] = useState<Diseno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

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
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-center text-red-700">
          {error}
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
                  download={diseno.titulo.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() + ".png"}
                  className="mt-4 flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-3 text-center font-black text-white transition hover:bg-red-700"
                >
                  ↓ Descargar PNG
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
