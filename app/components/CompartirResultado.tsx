"use client";

import { useState } from "react";

/**
 * Botones para compartir un resultado: el menú de compartir del teléfono
 * (si existe) y un acceso directo a WhatsApp. En computadora, copiar.
 */
export default function CompartirResultado({
  texto,
  titulo = "Resultado",
  oscuro = false,
}: {
  texto: string;
  titulo?: string;
  oscuro?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(texto)}`;

  async function compartir() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: titulo, text: texto });
        return;
      } catch {
        // La persona canceló o el navegador no pudo: se copia el texto.
      }
    }
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      window.prompt("Copia el resultado:", texto);
    }
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <button
        type="button"
        onClick={() => void compartir()}
        className={`rounded-xl px-4 py-2.5 text-sm font-black shadow ${
          oscuro ? "bg-white text-slate-900" : "bg-slate-900 text-white"
        }`}
      >
        {copiado ? "✅ Copiado" : "📤 Compartir resultado"}
      </button>
      <a
        href={whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-black text-white shadow"
      >
        WhatsApp
      </a>
    </div>
  );
}
