"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegistroPage() {
  const [f, setF] = useState({
    nombre_liga: "",
    slug_deseado: "",
    ciudad: "",
    contacto_nombre: "",
    contacto_correo: "",
    contacto_telefono: "",
    mensaje: "",
    sitio_web: "",
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);

  const cambiar = (campo: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF((a) => ({ ...a, [campo]: e.target.value }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    const respuesta = await fetch("/api/solicitudes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const datos = await respuesta.json().catch(() => ({}));
    setEnviando(false);
    if (!respuesta.ok) return setError(datos.error ?? "No se pudo enviar la solicitud.");
    setEnviado(true);
  }

  const campo = "mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-orange-500";
  const etiqueta = "block text-sm font-bold text-slate-700";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="text-center text-white">
          <p className="text-5xl">🏀</p>
          <h1 className="mt-3 text-4xl font-black">Quinteto Pro</h1>
          <p className="mt-3 text-lg text-slate-300">
            Estadísticas, calendario, planilla en vivo y diseños para redes sociales
            para tu liga de baloncesto.
          </p>
        </div>

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-2xl md:p-8">
          {enviado ? (
            <div className="py-8 text-center">
              <p className="text-5xl">✅</p>
              <h2 className="mt-3 text-2xl font-black text-slate-900">¡Solicitud recibida!</h2>
              <p className="mt-2 text-slate-600">
                Revisaremos los datos de tu liga y te escribiremos a <strong>{f.contacto_correo}</strong>.
              </p>
              <Link href="/ligas" className="mt-6 inline-block font-bold text-orange-600 underline">
                Ver las ligas en Quinteto Pro
              </Link>
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-4">
              <h2 className="text-2xl font-black text-slate-900">Solicita la cuenta de tu liga</h2>

              <label className={etiqueta}>
                Nombre de la liga *
                <input className={campo} value={f.nombre_liga} onChange={cambiar("nombre_liga")} required maxLength={120} />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className={etiqueta}>
                  Dirección deseada
                  <div className="mt-1 flex items-center rounded-xl border border-slate-300 bg-slate-50 pl-3">
                    <span className="text-sm text-slate-500">…/</span>
                    <input
                      className="w-full rounded-r-xl bg-white p-3 outline-none"
                      value={f.slug_deseado}
                      onChange={(e) => setF((a) => ({ ...a, slug_deseado: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                      maxLength={40}
                      placeholder="mi-liga"
                    />
                  </div>
                </label>
                <label className={etiqueta}>
                  Ciudad
                  <input className={campo} value={f.ciudad} onChange={cambiar("ciudad")} maxLength={80} />
                </label>
                <label className={etiqueta}>
                  Tu nombre *
                  <input className={campo} value={f.contacto_nombre} onChange={cambiar("contacto_nombre")} required maxLength={120} />
                </label>
                <label className={etiqueta}>
                  Tu correo *
                  <input type="email" className={campo} value={f.contacto_correo} onChange={cambiar("contacto_correo")} required />
                </label>
                <label className={etiqueta}>
                  Teléfono / WhatsApp
                  <input className={campo} value={f.contacto_telefono} onChange={cambiar("contacto_telefono")} maxLength={30} />
                </label>
              </div>
              <label className={etiqueta}>
                Cuéntanos de tu liga (equipos, temporada…)
                <textarea className={campo} rows={4} value={f.mensaje} onChange={cambiar("mensaje")} maxLength={1000} />
              </label>

              {/* Campo trampa para robots: oculto para las personas. */}
              <input
                type="text"
                name="sitio_web"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
                value={f.sitio_web}
                onChange={cambiar("sitio_web")}
              />

              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</p>}

              <button
                disabled={enviando}
                className="w-full rounded-xl bg-orange-500 py-4 text-lg font-black text-white shadow-lg hover:bg-orange-600 disabled:opacity-50"
              >
                {enviando ? "Enviando…" : "Enviar solicitud"}
              </button>
              <p className="text-center text-sm text-slate-500">
                Gratis durante el lanzamiento ·{" "}
                <Link href="/quinteto" className="font-bold text-orange-600 underline">¿Qué incluye?</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
