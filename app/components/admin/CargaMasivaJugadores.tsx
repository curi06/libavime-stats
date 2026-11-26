"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLiga } from "@/app/components/LigaContext";
import { leerLista, MAX_FILAS } from "@/lib/carga-jugadores";

const EJEMPLO = `Juan Pérez, 7, Base, Halcones
Pedro Ruiz, 23, Alero, Tiburones
Luis Gómez	10	Escolta	Halcones`;

/**
 * Carga de varios jugadores a la vez: se pega una lista (WhatsApp o Excel),
 * se revisa la vista previa y se guardan solo las líneas correctas.
 */
export default function CargaMasivaJugadores({
  existentes,
  onGuardado,
}: {
  existentes: { nombre: string; slug: string }[];
  onGuardado: () => void;
}) {
  const { liga, equipos } = useLiga();
  const [abierta, setAbierta] = useState(false);
  const [texto, setTexto] = useState("");
  const [equipoPorDefecto, setEquipoPorDefecto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const filas = useMemo(
    () => leerLista(texto, equipos.map((e) => e.nombre), equipoPorDefecto, existentes),
    [texto, equipos, equipoPorDefecto, existentes]
  );
  const validas = filas.filter((f) => !f.problema);
  const conProblema = filas.length - validas.length;

  async function guardar() {
    if (!validas.length) return;
    setGuardando(true);
    setError("");
    setMensaje("");
    const { data, error: errorGuardar } = await supabase
      .from("jugadores")
      .insert(
        validas.map((f) => ({
          liga_id: liga.id,
          nombre: f.nombre,
          slug: f.slug,
          numero: f.numero,
          posicion: f.posicion || null,
          equipo: f.equipo,
        }))
      )
      .select("id");
    setGuardando(false);
    if (errorGuardar) {
      setError(`No se pudieron guardar: ${errorGuardar.message}`);
      return;
    }
    // Deja en el cuadro solo las líneas que no se guardaron, para corregirlas.
    setTexto(filas.filter((f) => f.problema).map((f) => f.original).join("\n"));
    setMensaje(`✅ ${data?.length ?? validas.length} jugadores agregados.${conProblema ? ` Quedan ${conProblema} líneas por corregir.` : ""}`);
    onGuardado();
  }

  return (
    <section className="mt-6 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-4">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className="flex w-full items-center justify-between text-left text-lg font-black text-blue-950"
      >
        📋 Cargar varios jugadores a la vez
        <span className="text-2xl">{abierta ? "−" : "+"}</span>
      </button>

      {abierta && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-600">
            Pega la lista desde WhatsApp o Excel: <strong>un jugador por línea</strong> con nombre,
            número, posición y equipo, separados por coma (el orden del número, la posición y el
            equipo no importa).
          </p>

          <label className="block text-sm font-bold text-slate-700">
            Equipo para las líneas que no lo indiquen (opcional)
            <select
              value={equipoPorDefecto}
              onChange={(e) => setEquipoPorDefecto(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3"
            >
              <option value="">— Ninguno —</option>
              {equipos.map((e) => (
                <option key={e.id} value={e.nombre}>{e.nombre}</option>
              ))}
            </select>
          </label>

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={8}
            placeholder={EJEMPLO}
            aria-label="Lista de jugadores"
            className="w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-sm"
          />

          {filas.length > 0 && (
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <p className="mb-2 text-sm font-bold text-slate-700">
                Vista previa: {validas.length} listos
                {conProblema > 0 && <span className="text-amber-700"> · {conProblema} con problemas</span>}
                {filas.length >= MAX_FILAS && <span> · máximo {MAX_FILAS} por carga</span>}
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
                        ✅ <strong>{f.nombre}</strong>
                        {f.numero !== null && ` · #${f.numero}`}
                        {f.posicion && ` · ${f.posicion}`}
                        {` · ${f.equipo}`}
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
            {guardando ? "Guardando…" : `Guardar ${validas.length} jugadores`}
          </button>
        </div>
      )}
    </section>
  );
}
