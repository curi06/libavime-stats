"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Solicitud = {
  id: string;
  nombre_liga: string;
  slug_deseado: string | null;
  ciudad: string | null;
  contacto_nombre: string;
  contacto_correo: string;
  contacto_telefono: string | null;
  mensaje: string | null;
  estado: "pendiente" | "aprobada" | "rechazada";
  creada_en: string;
};

type LigaPanel = {
  id: string;
  slug: string;
  nombre: string;
  nombre_corto: string | null;
  ciudad: string | null;
  estado: "activa" | "pendiente" | "suspendida";
  creada_en: string;
};

const sugerirSlug = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export default function PlataformaPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [ligas, setLigas] = useState<LigaPanel[]>([]);
  const [slugs, setSlugs] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    const respuesta = await fetch("/api/plataforma", { cache: "no-store" });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) return setError(datos.error ?? "No se pudo cargar el panel.");
    setSolicitudes(datos.solicitudes);
    setLigas(datos.ligas);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde la API
    void cargar();
  }, [cargar]);

  async function accion(cuerpo: object, exito: string) {
    setOcupado(true);
    setError("");
    setMensaje("");
    const respuesta = await fetch("/api/plataforma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setOcupado(false);
    if (!respuesta.ok) return setError(datos.error ?? "La operación no se pudo completar.");
    setMensaje(datos.aviso ? `${exito} ⚠️ ${datos.aviso}` : exito);
    void cargar();
  }

  const pendientes = solicitudes.filter((s) => s.estado === "pendiente");
  const revisadas = solicitudes.filter((s) => s.estado !== "pendiente");

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black text-slate-900">🏀 Quinteto Pro · Plataforma</h1>
        <p className="mt-1 text-slate-600">Solicitudes de ligas nuevas y estado de las ligas.</p>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</p>}
        {mensaje && <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 font-bold text-green-800">{mensaje}</p>}

        <section className="mt-8">
          <h2 className="text-xl font-black text-slate-900">Solicitudes pendientes ({pendientes.length})</h2>
          {pendientes.length === 0 && <p className="mt-3 text-slate-500">No hay solicitudes pendientes.</p>}
          <div className="mt-3 space-y-4">
            {pendientes.map((s) => {
              const slug = slugs[s.id] ?? s.slug_deseado ?? sugerirSlug(s.nombre_liga);
              return (
                <article key={s.id} className="rounded-3xl bg-white p-6 shadow">
                  <div className="flex flex-col justify-between gap-2 md:flex-row">
                    <div>
                      <p className="text-xl font-black text-slate-900">{s.nombre_liga}</p>
                      <p className="text-sm text-slate-500">
                        {s.ciudad ?? "Sin ciudad"} · {new Date(s.creada_en).toLocaleDateString("es-DO")}
                      </p>
                    </div>
                    <div className="text-sm text-slate-700 md:text-right">
                      <p className="font-bold">{s.contacto_nombre}</p>
                      <p>{s.contacto_correo}</p>
                      {s.contacto_telefono && <p>{s.contacto_telefono}</p>}
                    </div>
                  </div>
                  {s.mensaje && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-slate-700">{s.mensaje}</p>}
                  <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
                    <label className="flex-1 text-sm font-bold text-slate-700">
                      Dirección de la liga
                      <div className="mt-1 flex items-center rounded-xl border border-slate-300 pl-3">
                        <span className="text-slate-500">/</span>
                        <input
                          className="w-full rounded-r-xl p-3 outline-none"
                          value={slug}
                          onChange={(e) => setSlugs((a) => ({ ...a, [s.id]: sugerirSlug(e.target.value) }))}
                        />
                      </div>
                    </label>
                    <button
                      disabled={ocupado}
                      onClick={() => void accion({ accion: "aprobar", solicitud_id: s.id, slug }, `✅ ${s.nombre_liga} creada en /${slug}.`)}
                      className="rounded-xl bg-green-600 px-5 py-3 font-black text-white disabled:opacity-50"
                    >
                      Aprobar y crear liga
                    </button>
                    <button
                      disabled={ocupado}
                      onClick={() => window.confirm(`¿Rechazar la solicitud de ${s.nombre_liga}?`) && void accion({ accion: "rechazar", solicitud_id: s.id }, "Solicitud rechazada.")}
                      className="rounded-xl border border-red-200 px-5 py-3 font-bold text-red-700 disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-black text-slate-900">Ligas ({ligas.length})</h2>
          <div className="mt-3 overflow-hidden rounded-3xl bg-white shadow">
            <ul className="divide-y divide-slate-100">
              {ligas.map((l) => (
                <li key={l.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <Link href={`/${l.slug}`} className="font-black text-slate-900 hover:underline">
                      {l.nombre_corto ?? l.nombre}
                    </Link>
                    <p className="text-sm text-slate-500">/{l.slug} · {l.ciudad ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        l.estado === "activa" ? "bg-green-100 text-green-800" : l.estado === "suspendida" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {l.estado}
                    </span>
                    {l.estado === "activa" ? (
                      <button
                        disabled={ocupado}
                        onClick={() => window.confirm(`¿Suspender ${l.nombre}? Su página dejará de ser pública.`) && void accion({ accion: "estado", liga_id: l.id, estado: "suspendida" }, `${l.nombre} suspendida.`)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"
                      >
                        Suspender
                      </button>
                    ) : (
                      <button
                        disabled={ocupado}
                        onClick={() => void accion({ accion: "estado", liga_id: l.id, estado: "activa" }, `${l.nombre} activada.`)}
                        className="rounded-xl bg-green-600 px-3 py-2 text-sm font-bold text-white"
                      >
                        Activar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {revisadas.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-black text-slate-900">Solicitudes revisadas</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {revisadas.map((s) => (
                <li key={s.id}>
                  {s.estado === "aprobada" ? "✅" : "❌"} {s.nombre_liga} · {s.contacto_correo}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
