"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiga } from "@/app/components/LigaContext";
import EnlaceInvitacion from "@/app/components/EnlaceInvitacion";

type Miembro = {
  usuario_id: string;
  nombre: string | null;
  correo: string | null;
  rol: "Administrador" | "Planilla" | "Consulta";
  puede_planilla: boolean;
  activo: boolean;
};

const DESCRIPCION_ROL = {
  Administrador: "Todo: equipos, jugadores, partidos, diseños, miembros y configuración.",
  Planilla: "Registra estadísticas y marcadores en la planilla.",
  Consulta: "Solo puede ver el panel.",
} as const;

export default function MiembrosPage() {
  const { liga, nombre: nombreLiga } = useLiga();
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [yo, setYo] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [nuevo, setNuevo] = useState({ nombre: "", correo: "", rol: "Planilla" as Miembro["rol"] });
  const [enviando, setEnviando] = useState(false);
  const [enlace, setEnlace] = useState<{ url: string; nombre: string } | null>(null);

  const api = `/api/ligas/miembros?liga=${liga.slug}`;

  const cargar = useCallback(async () => {
    setCargando(true);
    const respuesta = await fetch(api, { cache: "no-store" });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) setError(datos.error ?? "No se pudieron cargar los miembros.");
    else {
      setMiembros(datos.miembros);
      setYo(datos.yo);
    }
    setCargando(false);
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial desde la API
    void cargar();
  }, [cargar]);

  async function llamar(metodo: "POST" | "PATCH" | "DELETE", cuerpo?: object, extra = "") {
    setError("");
    setMensaje("");
    const respuesta = await fetch(api + extra, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      setError(datos.error ?? "La operación no se pudo completar.");
      return null;
    }
    return datos;
  }

  async function invitar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setEnlace(null);
    const datos = await llamar("POST", nuevo);
    setEnviando(false);
    if (!datos) return;
    if (datos.enlace) {
      setEnlace({ url: datos.enlace, nombre: nuevo.nombre });
      setMensaje(`✅ ${nuevo.nombre} fue agregado a ${nombreLiga}. Falta que cree su contraseña.`);
    } else {
      setMensaje(
        datos.invitado
          ? `📧 Invitación enviada a ${nuevo.correo}. Recibirá un correo para crear su contraseña.`
          : `✅ ${nuevo.nombre} ya tenía cuenta: se agregó a ${nombreLiga}.`
      );
    }
    setNuevo({ nombre: "", correo: "", rol: "Planilla" });
    void cargar();
  }

  async function cambiarRol(m: Miembro, rol: Miembro["rol"]) {
    if (await llamar("PATCH", { usuario_id: m.usuario_id, rol, puede_planilla: rol !== "Consulta" })) {
      setMensaje(`Rol de ${m.nombre ?? m.correo} actualizado a ${rol}.`);
      void cargar();
    }
  }

  async function quitar(m: Miembro) {
    if (!window.confirm(`¿Quitar a ${m.nombre ?? m.correo} de ${nombreLiga}?`)) return;
    if (await llamar("DELETE", undefined, `&usuario=${m.usuario_id}`)) {
      setMensaje(`${m.nombre ?? m.correo} ya no forma parte de la liga.`);
      void cargar();
    }
  }

  const campo = "mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-blue-600";

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-black text-blue-950">👥 Miembros de {nombreLiga}</h1>
      <p className="mt-1 text-slate-600">Quién puede administrar la liga y llevar la planilla.</p>

      <form onSubmit={invitar} className="mt-6 rounded-3xl bg-white p-6 shadow">
        <h2 className="text-lg font-black text-blue-950">Invitar a una persona</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-bold text-slate-700">
            Nombre
            <input className={campo} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required maxLength={120} />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Correo
            <input type="email" className={campo} value={nuevo.correo} onChange={(e) => setNuevo({ ...nuevo, correo: e.target.value })} required />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Rol
            <select className={campo} value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value as Miembro["rol"] })}>
              {Object.keys(DESCRIPCION_ROL).map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-2 text-sm text-slate-500">{DESCRIPCION_ROL[nuevo.rol]}</p>
        <button disabled={enviando} className="mt-4 rounded-xl bg-blue-950 px-6 py-3 font-black text-white disabled:opacity-50">
          {enviando ? "Enviando…" : "Invitar"}
        </button>
      </form>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</p>}
      {mensaje && <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 font-bold text-green-800">{mensaje}</p>}
      {enlace && <EnlaceInvitacion enlace={enlace.url} nombre={enlace.nombre} liga={nombreLiga} />}

      <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow">
        {cargando ? (
          <p className="p-6 text-slate-500">Cargando miembros…</p>
        ) : miembros.length === 0 ? (
          <p className="p-6 text-slate-500">Aún no hay miembros registrados.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {miembros.map((m) => (
              <li key={m.usuario_id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-black text-blue-950">
                    {m.nombre ?? "Sin nombre"} {m.usuario_id === yo && <span className="text-sm font-bold text-slate-400">(tú)</span>}
                    {!m.activo && <span className="ml-2 rounded bg-slate-200 px-2 text-xs font-bold text-slate-600">inactivo</span>}
                  </p>
                  <p className="text-sm text-slate-500">{m.correo}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label={`Rol de ${m.nombre ?? m.correo}`}
                    className="rounded-xl border border-slate-300 p-2 font-bold"
                    value={m.rol}
                    onChange={(e) => void cambiarRol(m, e.target.value as Miembro["rol"])}
                  >
                    {Object.keys(DESCRIPCION_ROL).map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <button onClick={() => void quitar(m)} className="rounded-xl border border-red-200 px-3 py-2 font-bold text-red-700 hover:bg-red-50">
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
