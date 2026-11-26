"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLiga } from "@/app/components/LigaContext";
import { leerCalendario, leerHora, MAX_PARTIDOS } from "@/lib/carga-partidos";

const EJEMPLO = `05/12/2026, 6:00 PM, Halcones vs Tiburones, Polideportivo Central
12/12, 7pm, Pumas - Halcones
2026-12-19	18:30	Tiburones	Pumas	Club Los Prados`;

/**
 * Carga del calendario completo: se pega una lista (WhatsApp o Excel), se
 * revisa la vista previa y se guardan los partidos correctos en la
 * temporada activa de la liga.
 */
export default function CargaMasivaPartidos({
  existentes,
  onGuardado,
}: {
  existentes: { fecha: string; local: string; visitante: string }[];
  onGuardado: () => void;
}) {
  const { liga, equipos } = useLiga();
  const [abierta, setAbierta] = useState(false);
  const [texto, setTexto] = useState("");
  const [horaDefecto, setHoraDefecto] = useState("");
  const [canchaDefecto, setCanchaDefecto] = useState("");
  const [fase, setFase] = useState<"serie_regular" | "finales">("serie_regular");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const horaNormalizada = horaDefecto.trim() ? leerHora(horaDefecto) : "";
  const filas = useMemo(
    () =>
      leerCalendario(
        texto,
        equipos.map((e) => e.nombre),
        { hora: horaNormalizada ?? "", cancha: canchaDefecto.trim() },
        existentes
      ),
    [texto, equipos, horaNormalizada, canchaDefecto, existentes]
  );
  const validas = filas.filter((f) => !f.problema);
  const conProblema = filas.length - validas.length;

  async function guardar() {
    if (!validas.length) return;
    setGuardando(true);
    setError("");
    setMensaje("");

    const { data: temporada } = await supabase
      .from("admin_temporadas")
      .select("id")
      .eq("liga_id", liga.id)
      .order("activa", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!temporada) {
      setGuardando(false);
      setError("La liga todavía no tiene una temporada. Créala en Temporadas.");
      return;
    }

    const { data, error: errorGuardar } = await supabase
      .from("partidos")
      .insert(
        validas.map((f) => ({
          liga_id: liga.id,
          temporada_id: temporada.id,
          equipo_local: f.local,
          equipo_visitante: f.visitante,
          fecha: f.fecha,
          hora: f.hora,
          cancha: f.cancha || null,
          estado: "Programado",
          fase,
        }))
      )
      .select("id");
    setGuardando(false);
    if (errorGuardar) {
      setError(`No se pudieron guardar: ${errorGuardar.message}`);
      return;
    }
    setTexto(filas.filter((f) => f.problema).map((f) => f.original).join("\n"));
    setMensaje(`✅ ${data?.length ?? validas.length} partidos agregados al calendario.${conProblema ? ` Quedan ${conProblema} líneas por corregir.` : ""}`);
    onGuardado();
  }

  const campo = "mt-1 w-full rounded-xl border border-slate-300 bg-white p-3";
  const fechaLegible = (f: string) => f.split("-").reverse().join("/");

  return (
    <section className="mt-6 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-4">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className="flex w-full items-center justify-between text-left text-lg font-black text-blue-950"
      >
        📋 Cargar el calendario completo
        <span className="text-2xl">{abierta ? "−" : "+"}</span>
      </button>

      {abierta && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-600">
            Pega el calendario desde WhatsApp o Excel: <strong>un partido por línea</strong> con
            fecha, hora, <em>Local vs Visitante</em> y cancha, separados por coma.
          </p>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
            <label className="text-sm font-bold text-slate-700">
              Hora si no se indica
              <input
                className={campo}
                value={horaDefecto}
                onChange={(e) => setHoraDefecto(e.target.value)}
                placeholder="6:00 PM"
                aria-invalid={horaNormalizada === null}
              />
              {horaNormalizada === null && <span className="text-xs text-red-700">Hora no válida</span>}
            </label>
            <label className="text-sm font-bold text-slate-700">
              Cancha si no se indica
              <input className={campo} value={canchaDefecto} onChange={(e) => setCanchaDefecto(e.target.value)} placeholder="Polideportivo Central" />
            </label>
            <label className="text-sm font-bold text-slate-700">
              Fase
              <select className={campo} value={fase} onChange={(e) => setFase(e.target.value as typeof fase)}>
                <option value="serie_regular">Serie regular</option>
                <option value="finales">Finales</option>
              </select>
            </label>
          </div>

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={8}
            placeholder={EJEMPLO}
            aria-label="Calendario de partidos"
            className="w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-sm"
          />

          {filas.length > 0 && (
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <p className="mb-2 text-sm font-bold text-slate-700">
                Vista previa: {validas.length} listos
                {conProblema > 0 && <span className="text-amber-700"> · {conProblema} con problemas</span>}
                {filas.length >= MAX_PARTIDOS && <span> · máximo {MAX_PARTIDOS} por carga</span>}
              </p>
              <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto text-sm">
                {filas.map((f) => (
                  <li key={f.linea} className="py-2">
                    {f.problema ? (
                      <p className="text-amber-800">
                        ⚠️ <span className="font-mono">{f.original.trim()}</span>
                        <br />
                        <span className="text-xs">{f.problema}</span>
                      </p>
                    ) : (
                      <p className="text-slate-800">
                        ✅ <strong>{fechaLegible(f.fecha)}</strong> · {f.hora} · <strong>{f.local}</strong> vs{" "}
                        <strong>{f.visitante}</strong>
                        {f.cancha && ` · ${f.cancha}`}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</p>}
          {mensaje && <p role="status" className="rounded-xl bg-green-50 p-3 font-bold text-green-800">{mensaje}</p>}

          <button
            type="button"
            disabled={!validas.length || guardando}
            onClick={() => void guardar()}
            className="w-full rounded-xl bg-blue-900 px-6 py-4 font-black text-white disabled:opacity-40"
          >
            {guardando ? "Guardando…" : `Guardar ${validas.length} partidos`}
          </button>
        </div>
      )}
    </section>
  );
}
