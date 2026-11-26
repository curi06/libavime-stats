"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLiga } from "@/app/components/LigaContext";

type Temporada = {
  id: number;
  nombre: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activa: boolean;
};

export default function TemporadasPage() {
  const router = useRouter();
  const { liga, nombre: nombreLiga } = useLiga();
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [partidosPorTemporada, setPartidosPorTemporada] = useState<Record<number, number>>({});
  const [nueva, setNueva] = useState({ nombre: `Temporada ${new Date().getFullYear() + 1}`, fecha_inicio: "", fecha_fin: "" });
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    const [{ data, error: e1 }, { data: partidos }] = await Promise.all([
      supabase
        .from("admin_temporadas")
        .select("id, nombre, fecha_inicio, fecha_fin, activa")
        .eq("liga_id", liga.id)
        .order("id", { ascending: false }),
      supabase.from("partidos").select("temporada_id").eq("liga_id", liga.id),
    ]);
    if (e1) return setError(e1.message);
    setTemporadas(data ?? []);
    const conteo: Record<number, number> = {};
    (partidos ?? []).forEach((p) => {
      conteo[p.temporada_id] = (conteo[p.temporada_id] ?? 0) + 1;
    });
    setPartidosPorTemporada(conteo);
  }, [liga.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
    void cargar();
  }, [cargar]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMensaje("");
    if (nueva.nombre.trim().length < 3) return setError("Escribe el nombre de la temporada.");
    if (nueva.fecha_inicio && nueva.fecha_fin && nueva.fecha_fin < nueva.fecha_inicio) {
      return setError("La fecha de fin no puede ser anterior al inicio.");
    }
    setOcupado(true);
    const { error: errorCrear } = await supabase.from("admin_temporadas").insert({
      liga_id: liga.id,
      nombre: nueva.nombre.trim(),
      fecha_inicio: nueva.fecha_inicio || null,
      fecha_fin: nueva.fecha_fin || null,
      activa: false,
    });
    setOcupado(false);
    if (errorCrear) return setError(errorCrear.message);
    setMensaje(`✅ ${nueva.nombre.trim()} creada. Actívala cuando empiece.`);
    void cargar();
  }

  /** Marca una temporada como la activa: los partidos nuevos se crearán en ella. */
  async function activar(t: Temporada) {
    if (!window.confirm(`¿Activar "${t.nombre}"? Los partidos nuevos se crearán en esta temporada.`)) return;
    setOcupado(true);
    setError("");
    setMensaje("");

    const otras = temporadas.filter((x) => x.activa && x.id !== t.id).map((x) => x.id);
    if (otras.length) {
      const { error: e1 } = await supabase.from("admin_temporadas").update({ activa: false }).in("id", otras).eq("liga_id", liga.id);
      if (e1) { setOcupado(false); return setError(e1.message); }
    }
    const { data: filas, error: e2 } = await supabase
      .from("admin_temporadas")
      .update({ activa: true })
      .eq("id", t.id)
      .eq("liga_id", liga.id)
      .select("id");
    if (e2 || !filas?.length) {
      setOcupado(false);
      return setError(e2?.message ?? "Solo los administradores de la liga pueden activar temporadas.");
    }

    // La página pública muestra el nombre e inicio de la temporada activa.
    const etiqueta = t.nombre.replace(/^temporada\s+/i, "").trim() || t.nombre;
    await supabase
      .from("ligas")
      .update({
        configuracion: {
          ...liga.configuracion,
          temporada: etiqueta,
          ...(t.fecha_inicio ? { inicio_temporada: t.fecha_inicio } : {}),
        },
      })
      .eq("id", liga.id);

    setOcupado(false);
    setMensaje(`✅ ${t.nombre} es ahora la temporada activa de ${nombreLiga}.`);
    void cargar();
    router.refresh();
  }

  const campo = "mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-blue-600";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-black text-blue-950">🗓️ Temporadas</h1>
      <p className="mt-1 text-slate-600">
        Los partidos nuevos se crean en la temporada activa. Las anteriores quedan guardadas.
      </p>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</p>}
      {mensaje && <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 font-bold text-green-800">{mensaje}</p>}

      <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow">
        {temporadas.length === 0 ? (
          <p className="p-6 text-slate-500">Esta liga todavía no tiene temporadas.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {temporadas.map((t) => (
              <li key={t.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-black text-blue-950">
                    {t.nombre}
                    {t.activa && <span className="ml-2 rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-800">ACTIVA</span>}
                  </p>
                  <p className="text-sm text-slate-500">
                    {t.fecha_inicio ?? "Sin fecha de inicio"} → {t.fecha_fin ?? "en curso"} · {partidosPorTemporada[t.id] ?? 0} partidos
                  </p>
                </div>
                {!t.activa && (
                  <button
                    disabled={ocupado}
                    onClick={() => void activar(t)}
                    className="rounded-xl bg-blue-950 px-4 py-2 font-bold text-white disabled:opacity-50"
                  >
                    Activar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={crear} className="mt-6 rounded-3xl bg-white p-6 shadow">
        <h2 className="text-lg font-black text-blue-950">Nueva temporada</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-bold text-slate-700">
            Nombre
            <input className={campo} value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} maxLength={60} required />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Inicio
            <input type="date" className={campo} value={nueva.fecha_inicio} onChange={(e) => setNueva({ ...nueva, fecha_inicio: e.target.value })} />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Fin
            <input type="date" className={campo} value={nueva.fecha_fin} onChange={(e) => setNueva({ ...nueva, fecha_fin: e.target.value })} />
          </label>
        </div>
        <button disabled={ocupado} className="mt-4 rounded-xl bg-blue-950 px-6 py-3 font-black text-white disabled:opacity-50">
          Crear temporada
        </button>
      </form>
    </div>
  );
}
