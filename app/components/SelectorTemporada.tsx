"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLiga } from "@/app/components/LigaContext";
import { temporadaActivaDe } from "@/lib/liga";

/**
 * Selector de temporada para las páginas públicas. Solo aparece si la
 * liga tiene más de una temporada. La activa no lleva ?temporada= en la
 * dirección; las anteriores sí, para poder compartir el enlace.
 */
export default function SelectorTemporada({ claro = false }: { claro?: boolean }) {
  const { temporadas, temporadaSeleccionada } = useLiga();
  const router = useRouter();
  const pathname = usePathname();
  const parametros = useSearchParams();

  if (temporadas.length < 2) return null;
  const activa = temporadaActivaDe(temporadas);

  function cambiar(id: string) {
    const nuevos = new URLSearchParams(parametros.toString());
    if (Number(id) === activa?.id) nuevos.delete("temporada");
    else nuevos.set("temporada", id);
    // Al cambiar de temporada, el partido elegido de la anterior ya no aplica.
    nuevos.delete("partido");
    const consulta = nuevos.toString();
    router.push(consulta ? `${pathname}?${consulta}` : pathname);
  }

  return (
    <label className={`inline-flex items-center gap-2 text-sm font-bold ${claro ? "text-white" : "text-slate-700"}`}>
      <span aria-hidden>🗓️</span>
      <span className="sr-only">Temporada</span>
      <select
        value={temporadaSeleccionada?.id ?? ""}
        onChange={(e) => cambiar(e.target.value)}
        className={`rounded-lg border px-2 py-1 font-bold ${
          claro ? "border-white/30 bg-white/10 text-white [&>option]:text-slate-900" : "border-slate-300 bg-white text-slate-800"
        }`}
      >
        {temporadas.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nombre}{t.id === activa?.id ? " (actual)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
